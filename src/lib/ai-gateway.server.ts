/**
 * Lovable AI Gateway — server-only helper
 *
 * 해커톤 데모용으로 AI 기능(사진 분석/대화 코칭/장소 추천)을 실제 동작시키기 위해
 * 이 프로젝트의 TanStack server function에서 Lovable AI Gateway를 호출합니다.
 *
 * 운영 환경에서는 Kotlin 백엔드가 동일 역할을 수행해야 합니다.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  >;
}

export async function callAiGateway(opts: {
  model?: string;
  messages: ChatMessage[];
  responseFormat?: "json_object";
  temperature?: number;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const body: Record<string, unknown> = {
    model: opts.model ?? "google/gemini-3-flash-preview",
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI 사용량이 잠시 한도에 도달했어요. 잠시 후 다시 시도해주세요.");
    if (res.status === 402) throw new Error("AI 크레딧이 부족합니다.");
    throw new Error(`AI Gateway ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return json.choices[0]?.message?.content ?? "";
}

export function parseJsonLoose<T>(text: string, fallback: T): T {
  // 모델이 ```json ... ``` 코드펜스로 감싸는 경우 제거
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}
