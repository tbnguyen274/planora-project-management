// Supabase Edge Function: AI Chat Assistant using Google Gemini
// Deploy with: supabase functions deploy chat

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  message?: string;
  history?: ChatMessage[];
  projectContext?: string;
}

const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONTEXT_LENGTH = 6000;
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_MESSAGE_LENGTH = 1500;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  return text.length > maxLength
    ? text.slice(0, maxLength) + "\n...[đã rút gọn]"
    : text;
}

function isValidChatMessage(msg: unknown): msg is ChatMessage {
  if (!msg || typeof msg !== "object") return false;

  const candidate = msg as ChatMessage;

  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    candidate.content.trim().length > 0
  );
}

function buildSystemPrompt(projectContext?: string): string {
  const safeProjectContext = projectContext
    ? truncateText(projectContext.trim(), MAX_CONTEXT_LENGTH)
    : "";

  return `Bạn là Planora AI, trợ lý quản lý dự án trong ứng dụng Planora.

Nhiệm vụ:
- Hỗ trợ Agile, Scrum, Kanban, task, sprint, backlog và quản lý dự án.
- Giúp viết hoặc cải thiện task, user story, acceptance criteria, sprint goal, mô tả dự án.
- Gợi ý chia nhỏ công việc, ước lượng effort, ưu tiên task, phát hiện rủi ro và bước tiếp theo.
- Hướng dẫn người dùng sử dụng Planora khi được hỏi.

Cách trả lời:
- Luôn dùng tiếng Việt.
- Thân thiện, rõ ràng, chuyên nghiệp.
- Ưu tiên câu trả lời ngắn gọn, thực dụng; mặc định tối đa 3-4 đoạn.
- Khi tạo nội dung cho task/user story, trình bày dạng dễ copy.
- Chỉ dùng dữ liệu có trong context; không bịa thông tin dự án.
- Nếu thiếu thông tin, hỏi tối đa 1-2 câu ngắn hoặc nêu giả định hợp lý.

${safeProjectContext ? `Context dự án:\n${safeProjectContext}` : ""}`;
}

function buildGeminiHistory(history?: ChatMessage[]) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(isValidChatMessage)
    .slice(-MAX_HISTORY_MESSAGES)
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [
        {
          text: truncateText(msg.content.trim(), MAX_HISTORY_MESSAGE_LENGTH),
        },
      ],
    }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed. Use POST.",
      },
      405,
    );
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return jsonResponse(
        {
          error: "AI service is not configured.",
        },
        500,
      );
    }

    let body: ChatRequestBody;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          error: "Invalid JSON body.",
        },
        400,
      );
    }

    const message = body.message?.trim();

    if (!message || typeof message !== "string") {
      return jsonResponse(
        {
          error: "Message is required.",
        },
        400,
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return jsonResponse(
        {
          error: `Message is too long. Max length is ${MAX_MESSAGE_LENGTH} characters.`,
        },
        400,
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.35,
        topP: 0.85,
        maxOutputTokens: 700,
      },
    });

    const systemPrompt = buildSystemPrompt(body.projectContext);
    const chatHistory = buildGeminiHistory(body.history);

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [
            {
              text:
                "Đã hiểu. Tôi sẽ hỗ trợ người dùng Planora bằng tiếng Việt, ngắn gọn, thực tế và không bịa dữ liệu dự án.",
            },
          ],
        },
        ...chatHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    if (!reply || reply.trim().length === 0) {
      return jsonResponse(
        {
          error: "AI returned an empty response.",
        },
        502,
      );
    }

    return jsonResponse(
      {
        reply: reply.trim(),
      },
      200,
    );
  } catch (error) {
    console.error("Chat function error:", error);

    const errorMessage = error instanceof Error
      ? error.message
      : "Internal server error";

    return jsonResponse(
      {
        error: errorMessage,
      },
      500,
    );
  }
});