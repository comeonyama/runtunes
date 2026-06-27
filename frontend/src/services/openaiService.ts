export type OpenAIConnectionResponse = {
  text: string;
};

function isOpenAIConnectionResponse(
  value: unknown,
): value is OpenAIConnectionResponse {
  if (typeof value !== "object" || value === null) return false;

  return (
    "text" in value &&
    typeof value.text === "string" &&
    value.text.trim().length > 0
  );
}

export async function requestOpenAIConnectionTest(): Promise<OpenAIConnectionResponse> {
  const response = await fetch("/api/openai/test", { method: "POST" });

  if (!response.ok) {
    throw new Error("Could not connect to OpenAI. Please try again.");
  }

  const data: unknown = await response.json();

  if (!isOpenAIConnectionResponse(data)) {
    throw new Error("OpenAI returned an unexpected response.");
  }

  return data;
}
