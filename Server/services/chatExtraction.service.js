/**
 * chatExtraction.service.js
 * 
 * Conversational Entity Extraction (CEE) Service for CLIENTRA.
 * Uses @google/genai SDK (Gemini 2.5 Flash) with Structured JSON outputs
 * to synthesize client conversation transcripts into structured projects and backlog tasks.
 * 
 * Strict constraint: NO ESTIMATED HOURS.
 */

// Helper to format messages into a clean, chronological transcript
export const formatChatTranscript = (messages) => {
  if (!Array.isArray(messages)) {
    return String(messages || "");
  }

  return messages
    .map((msg) => {
      const sender =
        msg.senderName ||
        (msg.sender
          ? `${msg.sender.firstName || ""} ${msg.sender.lastName || ""}`.trim() ||
            msg.sender.companyName ||
            msg.sender.name
          : null) ||
        "Participant";

      let time = "Recent";
      if (msg.createdAt) {
        try {
          const date = new Date(msg.createdAt);
          time = date.toISOString().replace("T", " ").substring(0, 16);
        } catch {
          time = "Recent";
        }
      }

      const text = (msg.text || msg.content || msg.message || "").trim();
      return text ? `[${time}] ${sender}: ${text}` : null;
    })
    .filter(Boolean)
    .join("\n");
};

/**
 * Calls Gemini Flash with @google/genai to extract structured project & tasks.
 * 
 * @param {Array<Object>|string} inputMessages - Array of Mongoose Message documents or formatted transcript
 * @returns {Promise<Object>} Extracted project proposal matching required schema
 */
export const extractProjectFromChat = async (inputMessages) => {
  const transcript = Array.isArray(inputMessages)
    ? formatChatTranscript(inputMessages)
    : String(inputMessages || "").trim();

  if (!transcript || transcript.length < 10) {
    throw new Error("Chat transcript is insufficient or empty for project extraction.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured in the environment. Please add it to your .env file."
    );
  }

  // Dynamic import of @google/genai for runtime resilience
  let GoogleGenAI, Type;
  try {
    const genaiModule = await import("@google/genai");
    GoogleGenAI = genaiModule.GoogleGenAI;
    Type = genaiModule.Type;
  } catch (err) {
    throw new Error(
      "The '@google/genai' SDK is required for project extraction. Run: npm install @google/genai (" +
        err.message +
        ")"
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  const systemInstruction = `You are the Conversational Entity Extraction (CEE) Engine for CLIENTRA, an enterprise digital agency management and orchestration platform.

OBJECTIVE:
Analyze conversational transcripts between agency team members and clients, separate actionable business requirements from noise/chatter, and synthesize a structured, schema-compliant project backlog.

EXTRACTION PROTOCOL & RULES:
1. NOISE REDUCTION & FILTERING:
   - Aggressively discard non-actionable utterances: social greetings ("Hey", "Good morning"), pleasantries, small talk, weekend chatter, and sign-offs.
   - Separate concrete scope agreements from tentative/exploratory ideas. If a client says "Maybe in the future we might need X", DO NOT extract X as an active task.

2. SLOT-FILLING SPECIFICATIONS:
   - projectName: Synthesize a professional, concise project title representing the campaign or build (e.g., "Q4 E-Commerce Rebrand & Landing Page").
   - clientSummary: 1-2 sentence executive overview summarizing client needs and project scope.
   - budgetCeiling: Extract any numeric budget agreed upon or capped (e.g. ₱45,000 or $5,000 -> 45000). Must be a pure Number or null if unspecified.
   - targetDeadline: Target completion or launch date formatted strictly as ISO date (YYYY-MM-DD), or null if unspecified.
   - confidenceScore: Number between 0.0 and 1.0 reflecting how complete, unambiguous, and actionable the requirements are.
   - tasks: Granular, actionable backlog tasks derived strictly from the agreed deliverables.

3. TASK SPECIFICATIONS:
   - title: Concise, actionable task title (e.g., "Design High-Fidelity Landing Page in Figma").
   - description: 1-3 sentences detailing expected deliverables, constraints, and acceptance criteria.
   - priority: Exactly one of: "Low", "Medium", "High", "Urgent".
   - CRITICAL RESTRICTION: DO NOT ESTIMATE OR OUTPUT HOURS. Do not include estimatedHours.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      projectName: {
        type: Type.STRING,
        description: "Synthesized professional project title.",
      },
      clientSummary: {
        type: Type.STRING,
        description: "1-2 sentence executive summary of agreed client deliverables.",
      },
      budgetCeiling: {
        type: Type.NUMBER,
        description: "Numeric budget limit or ceiling, or null if not mentioned.",
      },
      targetDeadline: {
        type: Type.STRING,
        description: "Target deadline strictly formatted as YYYY-MM-DD, or null if not mentioned.",
      },
      confidenceScore: {
        type: Type.NUMBER,
        description: "Confidence score between 0.0 and 1.0 based on requirement clarity.",
      },
      tasks: {
        type: Type.ARRAY,
        description: "Array of discrete, actionable backlog tasks for the project.",
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Actionable task title.",
            },
            description: {
              type: Type.STRING,
              description: "Clear description of deliverables and specifications.",
            },
            priority: {
              type: Type.STRING,
              enum: ["Low", "Medium", "High", "Urgent"],
              description: "Task priority.",
            },
          },
          required: ["title", "description", "priority"],
        },
      },
    },
    required: ["projectName", "clientSummary", "confidenceScore", "tasks"],
  };

  const userPrompt = `Analyze the following client conversation transcript and extract the project proposal and backlog tasks:\n\n--- TRANSCRIPT START ---\n${transcript}\n--- TRANSCRIPT END ---`;

  const configuredModel = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  const fallbackModels = ["gemini-flash-lite-latest", "gemini-3.8-flash", "gemini-3.5-flash"];
  const candidateModels = [
    configuredModel,
    ...fallbackModels.filter((m) => m !== configuredModel),
  ];

  let response;
  let lastError;

  for (const currentModel of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model: currentModel,
        contents: userPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          systemInstruction,
          temperature: 0.1,
        },
      });
      if (response?.text) {
        break;
      }
    } catch (err) {
      lastError = err;
      const isQuotaExceeded =
        err?.status === 429 ||
        err?.message?.includes("quota") ||
        err?.message?.includes("RESOURCE_EXHAUSTED");
      const isHighDemand =
        err?.status === 503 ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("temporarily unavailable");

      if (isQuotaExceeded || isHighDemand) {
        console.warn(
          `[chatExtraction] Model ${currentModel} returned ${err?.status || "busy"}. Trying fallback model...`
        );
        continue;
      }
      throw err;
    }
  }

  if (!response?.text) {
    if (lastError?.status === 429 || lastError?.message?.includes("quota")) {
      throw new Error(
        "Gemini free-tier request quota limit exceeded for today. Please wait a moment or upgrade your Google AI Studio plan."
      );
    }
    throw lastError || new Error("Failed to receive a valid response from Gemini.");
  }

  const responseText = response.text?.trim() || "";
  let rawJson;

  try {
    rawJson = JSON.parse(responseText);
  } catch (parseError) {
    // Fallback extraction in case markdown fences are present
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      rawJson = JSON.parse(match[0]);
    } else {
      throw new Error(
        `Failed to parse JSON response from Gemini: ${parseError.message}`
      );
    }
  }

  // Sanitize and validate payload
  const sanitized = {
    projectName: String(rawJson.projectName || "Client Project").trim(),
    clientSummary: String(rawJson.clientSummary || "").trim(),
    budgetCeiling:
      typeof rawJson.budgetCeiling === "number" && !isNaN(rawJson.budgetCeiling)
        ? rawJson.budgetCeiling
        : null,
    targetDeadline:
      typeof rawJson.targetDeadline === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(rawJson.targetDeadline)
        ? rawJson.targetDeadline
        : null,
    confidenceScore:
      typeof rawJson.confidenceScore === "number" && !isNaN(rawJson.confidenceScore)
        ? Math.min(Math.max(rawJson.confidenceScore, 0), 1)
        : 0.85,
    tasks: Array.isArray(rawJson.tasks)
      ? rawJson.tasks.map((task) => ({
          title: String(task.title || "Untitled Task").trim(),
          description: String(task.description || "").trim(),
          priority: ["Low", "Medium", "High", "Urgent"].includes(task.priority)
            ? task.priority
            : "Medium",
        }))
      : [],
  };

  return sanitized;
};

export default {
  extractProjectFromChat,
  formatChatTranscript,
};
