export type AiMessageRole = "user" | "assistant" | "system";

export type AiMessage = {
  role: AiMessageRole;
  content: string;
};

export type AiFileChange = {
  filePath: string;
  content: string;
};

export type AiResponse = {
  message: string;
  fileChange?: AiFileChange;
};

export async function sendAiChatRequest(
  messages: AiMessage[],
  options?: {
    cwd?: string;
    model?: string;
  },
): Promise<AiResponse> {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (!lastUserMessage) {
    throw new Error("No user message was provided.");
  }

  const response = await window.api.sendCodex({
    message: lastUserMessage.content,
    cwd: options?.cwd,
    model: options?.model,
  });

  if (!response?.success) {
    throw new Error(response?.message || "Failed to send message to Codex.");
  }

  return {
    message: response.message || "",
    fileChange: response.fileChange,
  };
}
