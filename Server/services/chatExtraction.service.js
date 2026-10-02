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
Analyze conversational transcripts between agency team members and clients, separate actionable business requirements from noise/chatter, and synthesize a structured, schema-compliant project proposal with timeline, down payment, budget, and backlog tasks.

ANCHOR REFERENCE DATE CONTEXT:
- Today's Reference Date: ${refIsoDate} (${refDayName})
- Current Year: ${refYear}
- Use this reference date and the message timestamps to resolve ALL relative and calendar date expressions with exact precision.

EXTRACTION PROTOCOL & RULES:
1. NOISE REDUCTION & FILTERING:
   - Aggressively discard non-actionable utterances: social greetings ("Hey", "Good morning"), pleasantries, small talk, weekend chatter, and sign-offs.
   - Separate concrete scope agreements from tentative/exploratory ideas. If a client says "Maybe in the future we might need X", DO NOT extract X as an active task.

2. TIMELINE & DATES EXTRACTION (startDate & targetDeadline):
   A. START DATE (startDate):
      - Identify when the project is scheduled to begin or kickoff.
      - Look for phrases like: "let's kick off Monday", "we can start tomorrow", "start work on [date]", "starting Nov 1", "begin next week".
      - Resolve relative terms accurately:
        * "today" -> ${refIsoDate}
        * "tomorrow" -> ${addDaysToIso(refIsoDate, 1)}
        * "next Monday / Tuesday / etc." -> compute the upcoming date for that day of the week
        * "start of next month" -> 1st day of next month
      - If no explicit future kickoff date is agreed, default to the conversation anchor date: ${refIsoDate}.
      - Format strictly as ISO date (YYYY-MM-DD).

   B. DUE DATE / DEADLINE (targetDeadline):
      - Identify the agreed target completion, delivery, launch, or deadline date.
      - Look for explicit dates: "need this by Nov 15", "deadline is Oct 25th", "launch on Dec 1st".
      - Look for relative targets: "by next Friday", "end of this month", "end of next week".
      - Look for duration / turnaround phrases relative to startDate:
        * "in 2 weeks" / "2-week timeline" -> startDate + 14 days
        * "within 10 days" / "10-day turnaround" -> startDate + 10 days
        * "1 month turnaround" -> startDate + 30 days
        * "3-week project" -> startDate + 21 days
        * "rush: in 48 hours" / "in 2 days" -> startDate + 2 days
      - Phased Delivery: If intermediate milestones are discussed (e.g. "wireframes by Friday, full design by the 30th"), targetDeadline MUST be the final project delivery date.
      - Validation: targetDeadline must always be on or after startDate.
      - Format strictly as ISO date (YYYY-MM-DD), or null if no deadline or duration is mentioned.

3. DOWN PAYMENT DETECTION (downPayment):
   Analyze any negotiation, request, or agreement regarding down payments, deposits, upfront payments, or billing milestones:
   A. PERCENTAGE MODE ("percentage"):
      - When down payment is structured as a percentage or ratio upfront.
      - Phrases: "50% down payment", "30% upfront", "we require a 50% deposit", "half upfront, half on completion", "50/50 split", "20% initial advance", "one-third deposit".
      - mode: "percentage"
      - value: The percentage number between 1 and 100 (e.g., 50 for 50%, 30 for 30%, 33.33 for 1/3, 25 for 25%). NEVER output decimal fraction like 0.5.
   B. FIXED AMOUNT MODE ("fixed"):
      - When a specific currency amount is agreed or requested as deposit/advance.
      - Phrases: "₱10,000 down payment", "5,000 upfront deposit", "initial payment of 15000", "$2,000 down", "pay 5k first".
      - mode: "fixed"
      - value: Pure numeric amount (e.g. 10000, 5000, 2000). Strip all currency symbols (₱, $, PHP) and commas.
   C. NONE MODE ("none"):
      - When no down payment or upfront deposit is discussed, or when parties agree to 100% payment upon completion / on delivery ("Pay in full upon completion", "Net 30 after delivery", "No upfront required").
      - mode: "none"
      - value: null
   - Provide an explanation summarizing the quotation or agreement.

4. BUDGET CEILING:
   - Extract numeric budget agreed upon or capped (e.g. ₱45,000 or $5,000 -> 45000). Must be a pure Number or null if unspecified.

5. TASK SPECIFICATIONS:
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
