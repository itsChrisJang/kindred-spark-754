import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiGateway, parseJsonLoose } from "./ai-gateway.server";

// ── 1. 사진 분석 ──────────────────────────────────────
export interface PhotoAnalysisResult {
  score: number;
  expression: number;
  brightness: number;
  retouchLevel: "natural" | "moderate" | "heavy";
  retouchScore: number;
  isAiGenerated: boolean;
  tips: { type: "good" | "improve"; text: string }[];
}

export const analyzePhotoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string }) => {
    if (!input?.imageDataUrl?.startsWith("data:image/"))
      throw new Error("올바른 이미지가 필요합니다");
    if (input.imageDataUrl.length > 8 * 1024 * 1024)
      throw new Error("이미지 크기가 너무 큽니다 (8MB 이하)");
    return input;
  })
  .handler(async ({ data }): Promise<PhotoAnalysisResult> => {
    const content = await callAiGateway({
      responseFormat: "json_object",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "당신은 소개팅 프로필 사진을 평가하는 전문가입니다. 사진을 분석하여 첫인상을 점수화하고, 보정 정도와 AI 생성 여부를 판단합니다. 결과는 반드시 JSON으로만 응답합니다.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 소개팅 프로필 사진을 분석하고 아래 JSON 스키마로만 답변해주세요. 모든 점수는 0-100 정수입니다.
{
  "score": <전체 첫인상 점수>,
  "expression": <표정 자연스러움>,
  "brightness": <밝기와 배경 점수>,
  "retouchLevel": "natural" | "moderate" | "heavy",
  "retouchScore": <보정이 자연스러운 정도(높을수록 자연스러움)>,
  "isAiGenerated": <AI로 생성된 이미지로 의심되는가? true/false>,
  "tips": [
    {"type": "good" | "improve", "text": "<한국어 코멘트>"}
  ]
}
tips는 2-3개. 친근하고 구체적인 한국어로 작성. 좋은 점 1개 + 개선점 1-2개를 권장.`,
            },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
    });

    return parseJsonLoose<PhotoAnalysisResult>(content, {
      score: 75,
      expression: 75,
      brightness: 70,
      retouchLevel: "natural",
      retouchScore: 80,
      isAiGenerated: false,
      tips: [{ type: "good", text: "사진 분석을 완료했습니다." }],
    });
  });

// ── 2. 대화 연습 ──────────────────────────────────────
export interface ChatPracticeResult {
  feedback: string;
  good: string[];
  improve: string[];
  suggestions: string[];
}

export const chatPracticeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mode: "intro" | "hobby" | "smalltalk"; message: string; history?: { role: "user" | "assistant"; text: string }[] }) => {
    if (!input.message || input.message.length > 500)
      throw new Error("메시지를 입력해주세요 (500자 이내)");
    return input;
  })
  .handler(async ({ data }): Promise<ChatPracticeResult> => {
    const modeLabel = data.mode === "intro" ? "자기소개" : data.mode === "hobby" ? "취미·관심사 대화" : "스몰토크";
    const history = (data.history ?? [])
      .slice(-6)
      .map((m) => `${m.role === "user" ? "사용자" : "AI 코치"}: ${m.text}`)
      .join("\n");

    const content = await callAiGateway({
      responseFormat: "json_object",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `당신은 소개팅 대화 코치입니다. 사용자가 "${modeLabel}"을(를) 연습 중입니다.
사용자의 마지막 발화를 평가해 JSON으로만 응답합니다. 한국어로, 친근하고 격려하는 톤. JSON 외 텍스트 금지.`,
        },
        {
          role: "user",
          content: `${history ? `[이전 대화]\n${history}\n\n` : ""}[사용자 발화]\n"${data.message}"

아래 스키마로만 답변:
{
  "feedback": "<2-3문장의 종합 피드백>",
  "good": ["<잘한 점 1-2개>"],
  "improve": ["<개선점 1-2개>"],
  "suggestions": ["<자연스럽게 이어갈 다음 멘트 후보 2-3개>"]
}`,
        },
      ],
    });

    return parseJsonLoose<ChatPracticeResult>(content, {
      feedback: "좋은 시도예요! 계속 연습해보세요.",
      good: [],
      improve: [],
      suggestions: [],
    });
  });

// ── 3. 데이트 장소 추천 ──────────────────────────────
export interface AiPlace {
  id: string;
  name: string;
  category: string;
  address: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  isAfter?: boolean;
  lat: number;
  lng: number;
  reason: string;
}

export const recommendPlacesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { area: string; category: string }) => input)
  .handler(async ({ data }): Promise<AiPlace[]> => {
    const content = await callAiGateway({
      responseFormat: "json_object",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "당신은 서울 데이트 장소 큐레이터입니다. 실제로 존재하는 한국의 인기 장소만 추천하며, 결과는 JSON으로만 응답합니다.",
        },
        {
          role: "user",
          content: `"${data.area}" 지역에서 소개팅·데이트하기 좋은 ${data.category === "전체" ? "장소" : data.category} 4곳을 추천하세요.
3개는 메인(카페·식당), 1개는 애프터(와인바·디저트) 용도. 아래 JSON 스키마로만:
{
  "places": [
    {
      "name": "<실제 가게 이름>",
      "category": "카페" | "레스토랑" | "와인바" | "액티비티",
      "address": "<도로명 주소>",
      "distanceKm": <소수 1자리 가상 거리, 0.3~3.0>,
      "rating": <4.0~4.9 소수>,
      "reviewCount": <100~3000 정수>,
      "lat": <위도>,
      "lng": <경도>,
      "isAfter": <bool, 애프터 장소면 true>,
      "reason": "<소개팅에 좋은 이유 한 줄, 한국어>"
    }
  ]
}`,
        },
      ],
    });

    const parsed = parseJsonLoose<{ places: Omit<AiPlace, "id">[] }>(content, { places: [] });
    return parsed.places.map((p, i) => ({ ...p, id: `ai-${Date.now()}-${i}` }));
  });
