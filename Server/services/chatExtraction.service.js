/**
 * chatExtraction.service.js
 * 
 * Conversational Entity Extraction (CEE) Service for CLIENTRA.
 * Uses @google/genai SDK (Gemini 2.5 Flash) with Structured JSON outputs
 * to synthesize client conversation transcripts into structured projects,
 * timeline (start date & due date), down payments, and backlog tasks.
 * 
 * Strict constraints:
 * - NO ESTIMATED HOURS.
 * - Accurate calendar anchor date resolution for relative dates.
 * - Deep down payment extraction (percentage or fixed).
 */

// Helper to format messages into a clean, chronological transcript with weekday indicators
export const formatChatTranscript = (messages) => {
  if (!Array.isArray(messages)) {
    return String(messages || "");
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
          if (!isNaN(date.getTime())) {
            const day = days[date.getDay()];
            const iso = date.toISOString().replace("T", " ").substring(0, 16);
            time = `${iso} (${day})`;
          }
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

// Helper: Calculate date addition in YYYY-MM-DD format
const addDaysToIso = (isoStr, days) => {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
};

// Fallback regex detector for down payment if model omits or returns "none" on obvious text
const detectDownPaymentFallback = (text) => {
  if (!text || typeof text !== "string") return null;

  // 1. Check half / 50-50 expressions
  if (/\b(?:50\/50|half\s*(?:and|&)\s*half|half\s*upfront|50%\s*down)\b/i.test(text)) {
    return {
      mode: "percentage",
      value: 50,
      explanation: "Detected 50% split / half upfront in conversation transcript.",
    };
  }

  // 2. Check percentage expressions: "30% down payment", "20% upfront deposit"
  const pctMatch =
    text.match(/(\d{1,2}(?:\.\d+)?)\s*%\s*(?:down\s*payment|downpayment|deposit|upfront|advance|initial)/i) ||
    text.match(/(?:down\s*payment|downpayment|deposit|upfront|advance|initial)\s*(?:of|is|:)?\s*(\d{1,2}(?:\.\d+)?)\s*%/i);
  if (pctMatch) {
    const val = parseFloat(pctMatch[1]);
    if (val > 0 && val <= 100) {
      return {
        mode: "percentage",
        value: val,
        explanation: `Detected ${val}% down payment in conversation transcript.`,
      };
    }
  }

  // 3. Check fixed monetary expressions: "₱10,000 down payment", "5000 upfront"
  const fixedMatch =
    text.match(/(?:down\s*payment|downpayment|deposit|upfront|advance|initial\s*payment)\s*(?:of|is|:)?\s*(?:₱|php|pesos?|\$)?\s*([\d,]+(?:\.\d{2})?)/i) ||
    text.match(/(?:₱|php|\$)\s*([\d,]+(?:\.\d{2})?)\s*(?:down\s*payment|downpayment|deposit|upfront|advance)/i);
  if (fixedMatch) {
    const num = parseFloat(fixedMatch[1].replace(/,/g, ""));
    if (!isNaN(num) && num > 0) {
      return {
        mode: "fixed",
        value: num,
        explanation: `Detected ₱${num} fixed down payment in conversation transcript.`,
      };
    }
  }

  return null;
};

/**
 * Calls Gemini Flash with @google/genai to extract structured project, timeline, down payment & tasks.
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

  // Determine anchor reference date from latest message or current system time
  let referenceDate = new Date();
  if (Array.isArray(inputMessages) && inputMessages.length > 0) {
    const lastMsgWithDate = [...inputMessages].reverse().find((m) => m?.createdAt);
    if (lastMsgWithDate?.createdAt) {
      const d = new Date(lastMsgWithDate.createdAt);
      if (!isNaN(d.getTime())) {
        referenceDate = d;
      }
    }
  }

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const refIsoDate = referenceDate.toISOString().split("T")[0]; // YYYY-MM-DD
  const refDayName = dayNames[referenceDate.getDay()];
  const refYear = referenceDate.getFullYear();

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

  const systemInstruction = `You are the Conversational Entity Extraction (CEE) Engine for CLIENTRA, an enterprise digital agency management and orchestration platform.

OBJECTIVE:
Analyze the chronological conversation transcript and extract ONLY the single, MOST RECENT active project proposal and its backlog tasks. Discard all historical projects, past completed scopes, noise, and speculative ideas.

ANCHOR REFERENCE DATE CONTEXT:
- Today's Reference Date: ${refIsoDate} (${refDayName})
- Current Year: ${refYear}
- Use this reference date and the message timestamps to resolve ALL relative and calendar date expressions with exact precision.

CRITICAL PROTOCOLS & BOUNDARY RULES:

1. TEMPORAL BOUNDARY & SCOPE ANCHORING (CRITICAL):
   - A single conversation may contain history spanning days, weeks, or months.
   - Scan the transcript chronologically to identify the LATEST / NEWEST project being actively initiated or negotiated.
   - PAST / COMPLETED PROJECTS: If previous messages discuss deliverables that are marked as "done", "finished", "wrapped", "settled", "already delivered", or have settled invoices (e.g. past catalogs, previous design rounds), TREAT THEM AS CLOSED HISTORY. DO NOT extract tasks, deadlines, or budgets from them.
   - NEVER aggregate tasks from older, distinct projects into the new project.

2. SPECULATIVE & REJECTED SCOPE FILTERING:
   - FUTURE / BRAINSTORMING: Ideas framed as tentative, exploratory, or long-term (e.g., "brainstorming for next year", "maybe down the line we might do X", "no budget or timeline yet") MUST BE IGNORED.
   - EXPLICIT NEGATION: If a deliverable was suggested but explicitly postponed, skipped, or rejected (e.g., "skip the newsletter for now", "let's hold off on the mobile app"), DO NOT create a task for it.

3. ACTIVE PARAMETER EXTRACTION:
   - projectName: Synthesize a concise title for the CURRENT active project (e.g., "Q4 Brand Revamp & Web Launch"). Do not mention closed past projects.
   - clientSummary: 1-2 sentence executive summary of ONLY the currently agreed scope.
   - budgetCeiling: Extract ONLY the budget explicitly agreed upon or capped for this NEW project. Ignore past settled payment amounts (e.g., ignore the ₱15,000 catalog balance; capture the ₱55,000 project budget). Return a pure Number or null.
   - startDate: ISO date (YYYY-MM-DD) when the project is scheduled to begin or kickoff (e.g., "kick off Monday", "start tomorrow"). If no explicit future kickoff date is agreed, default to the conversation anchor date: ${refIsoDate}.
   - targetDeadline: ISO date (YYYY-MM-DD) for the current project delivery or deadline, or null. Validate that targetDeadline is on or after startDate.
   - downPayment: Detect upfront deposit or billing milestone agreements:
     * mode: "percentage" (e.g., 50 for 50%, 30 for 30%), "fixed" (pure numeric currency amount, e.g. 10000), or "none" (if paid in full upon delivery / completion).
     * value: Pure numeric amount (e.g. 50 or 10000) or null if mode is "none".
     * explanation: Brief quotation or rationale.
   - confidenceScore: Number (0.0 to 1.0) indicating clarity of agreed scope.
   - tasks: Only tasks belonging strictly to the NEW, UNCOMPLETED project scope.

4. TASK SPECIFICATIONS:
   - title: Clear, actionable title (e.g., "Figma Landing Page UI/UX Design").
   - description: 1-2 sentences on deliverables and acceptance criteria.
   - requiredSkills: Array of specific tools or skills (e.g., ["Figma", "UI/UX", "React", "Photoshop"]).
   - priority: Exactly one of: "Low", "Medium", "High", "Urgent".
   - CRITICAL: DO NOT include estimated hours.`;

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
      startDate: {
        type: Type.STRING,
        description:
          "Project start or kickoff date formatted strictly as ISO date (YYYY-MM-DD). If not explicitly stated, use the conversation anchor date.",
      },
      targetDeadline: {
        type: Type.STRING,
        description:
          "Target completion or launch deadline strictly formatted as ISO date (YYYY-MM-DD), or null if not mentioned.",
      },
      downPayment: {
        type: Type.OBJECT,
        description: "Detected down payment or upfront deposit requirements.",
        properties: {
          mode: {
            type: Type.STRING,
            enum: ["percentage", "fixed", "none"],
            description: "Down payment type: 'percentage', 'fixed', or 'none'.",
          },
          value: {
            type: Type.NUMBER,
            description:
              "Numeric value of down payment (e.g. 50 for 50%, or 5000 for ₱5,000). Null if mode is 'none'.",
          },
          explanation: {
            type: Type.STRING,
            description:
              "Brief rationale or direct quote explaining how this down payment was derived.",
          },
        },
        required: ["mode"],
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
            requiredSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Array of specific tools or skills required (e.g. ['Figma', 'UI/UX', 'React', 'Photoshop']).",
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
    required: ["projectName", "clientSummary", "startDate", "confidenceScore", "tasks"],
  };

  const userPrompt = `Analyze the following client conversation transcript and extract the project proposal, timeline, down payment, and backlog tasks:\n\n--- TRANSCRIPT START ---\n${transcript}\n--- TRANSCRIPT END ---`;

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

  // 1. Sanitize Budget
  const sanitizedBudget =
    typeof rawJson.budgetCeiling === "number" && !isNaN(rawJson.budgetCeiling)
      ? Math.max(0, rawJson.budgetCeiling)
      : null;

  // 2. Sanitize Timeline Dates
  let sanitizedStartDate =
    typeof rawJson.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawJson.startDate)
      ? rawJson.startDate
      : refIsoDate;

  let sanitizedDeadline =
    typeof rawJson.targetDeadline === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(rawJson.targetDeadline)
      ? rawJson.targetDeadline
      : null;

  // Fallback: Check if transcript mentioned a duration if LLM didn't return targetDeadline
  if (!sanitizedDeadline) {
    const durationMatch =
      transcript.match(/\b(?:in|within|for)\s*(\d+)\s*(days?|weeks?|months?)\b/i) ||
      transcript.match(/\b(\d+)[ -](?:day|week|month)\s*(?:turnaround|timeline|deadline|sprint)\b/i);
    if (durationMatch) {
      const qty = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2].toLowerCase();
      let daysToAdd = qty;
      if (unit.startsWith("week")) daysToAdd = qty * 7;
      if (unit.startsWith("month")) daysToAdd = qty * 30;
      sanitizedDeadline = addDaysToIso(sanitizedStartDate, daysToAdd);
    }
  }

  // Ensure targetDeadline is on or after startDate
  if (sanitizedDeadline && sanitizedStartDate && sanitizedDeadline < sanitizedStartDate) {
    sanitizedDeadline = sanitizedStartDate;
  }

  // 3. Sanitize Down Payment
  let downPaymentResult = {
    mode: "none",
    value: null,
    explanation: "",
  };

  if (rawJson.downPayment && ["percentage", "fixed", "none"].includes(rawJson.downPayment.mode)) {
    const mode = rawJson.downPayment.mode;
    let val =
      typeof rawJson.downPayment.value === "number" && !isNaN(rawJson.downPayment.value)
        ? rawJson.downPayment.value
        : null;

    if (mode === "percentage" && val !== null) {
      // If model returned fractional e.g. 0.5 instead of 50
      if (val > 0 && val <= 1) {
        val = Math.round(val * 100);
      }
      val = Math.min(Math.max(val, 0), 100);
    } else if (mode === "fixed" && val !== null) {
      val = Math.max(0, val);
      if (sanitizedBudget && val > sanitizedBudget) {
        val = sanitizedBudget;
      }
    }

    downPaymentResult = {
      mode,
      value: mode === "none" ? null : val,
      explanation:
        typeof rawJson.downPayment.explanation === "string"
          ? rawJson.downPayment.explanation.trim()
          : "",
    };
  }

  // Fallback: If model returned "none" or null value, but transcript clearly contains down payment
  if (downPaymentResult.mode === "none" || downPaymentResult.value === null) {
    const fallbackDP = detectDownPaymentFallback(transcript);
    if (fallbackDP) {
      downPaymentResult = fallbackDP;
    }
  }

  // 4. Assemble Sanitized Payload
  const sanitized = {
    projectName: String(rawJson.projectName || "Client Project").trim(),
    clientSummary: String(rawJson.clientSummary || "").trim(),
    budgetCeiling: sanitizedBudget,
    startDate: sanitizedStartDate,
    targetDeadline: sanitizedDeadline,
    downPayment: downPaymentResult,
    confidenceScore:
      typeof rawJson.confidenceScore === "number" && !isNaN(rawJson.confidenceScore)
        ? Math.min(Math.max(rawJson.confidenceScore, 0), 1)
        : 0.85,
    tasks: Array.isArray(rawJson.tasks)
      ? rawJson.tasks.map((task) => ({
          title: String(task.title || "Untitled Task").trim(),
          description: String(task.description || "").trim(),
          requiredSkills: Array.isArray(task.requiredSkills)
            ? task.requiredSkills
                .map((skill) => String(skill || "").trim())
                .filter(Boolean)
            : [],
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
