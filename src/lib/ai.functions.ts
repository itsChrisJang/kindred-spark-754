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
  styleScore: number;
  styleComment: string;
  compositionScore: number;
  gazeDirection: "camera" | "side" | "away";
  framing: "closeup" | "bust" | "fullbody" | "wide";
  photoType: "selfie" | "portrait" | "fullbody" | "group" | "scenery";
  suitability: "main" | "sub" | "replace";
  suitabilityReason: string;
  oneLiner: string;
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
  "styleScore": <옷차림 정돈도/스타일 점수 0-100>,
  "styleComment": "<옷차림에 대한 구체적인 한국어 코멘트 1문장>",
  "compositionScore": <시선·구도 점수 0-100>,
  "gazeDirection": "camera" | "side" | "away",
  "framing": "closeup" | "bust" | "fullbody" | "wide",
  "photoType": "selfie" | "portrait" | "fullbody" | "group" | "scenery",
  "suitability": "main" | "sub" | "replace",
  "suitabilityReason": "<왜 그 등급인지 한국어 1문장>",
  "oneLiner": "<사진을 본 솔직한 한 줄 평. 한국어 1문장, 18-40자. 자극적이고 웃긴 톤(살짝 디스 + 위트). 예: '소개팅 사진 맞아요? 증명사진 같은데요 ㅋㅋ', '이 각도, 본인 인생샷이라고 우기는 그 사진이죠?', '잘생긴 건 알겠는데 표정이 면접 보러 온 사람 같아요'. 인신공격·외모비하·성별/외형 비하 금지. 본인이 들어도 빵 터지는 친구 톤.">,
  "tips": [
    {"type": "good" | "improve", "text": "<한국어 코멘트>"}
  ]
}
tips는 2-3개. 친근하고 구체적인 한국어. 좋은 점 1개 + 개선점 1-2개 권장.`,
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
      styleScore: 70,
      styleComment: "단정한 옷차림이에요.",
      compositionScore: 70,
      gazeDirection: "camera",
      framing: "bust",
      photoType: "portrait",
      suitability: "sub",
      suitabilityReason: "프로필 서브 컷으로 적합해요.",
      tips: [{ type: "good", text: "사진 분석을 완료했습니다." }],
    });
  });

// ── 2. 대화 연습 ──────────────────────────────────────
export interface ChatPracticeResult {
  partnerReply: string;
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
    const personaHint =
      data.mode === "intro"
        ? "처음 만난 소개팅 상대로서 살짝 긴장한 듯하지만 호감 있고 자연스럽게 자기소개에 반응"
        : data.mode === "hobby"
          ? "공통점을 찾으려는 호기심 많은 소개팅 상대로서 취미 이야기에 관심을 보이며 되묻기"
          : "편안한 분위기에서 가볍게 농담도 섞는 소개팅 상대로서 스몰토크에 자연스럽게 받아치기";

    const history = (data.history ?? [])
      .slice(-8)
      .map((m) => `${m.role === "user" ? "사용자" : "상대"}: ${m.text}`)
      .join("\n");

    const content = await callAiGateway({
      responseFormat: "json_object",
      temperature: 0.85,
      messages: [
        {
          role: "system",
          content: `당신은 소개팅 대화 코치이자 동시에 사용자의 가상 소개팅 상대 역할을 합니다.
사용자는 지금 "${modeLabel}"을(를) 연습하고 있습니다.
두 가지 역할을 한 번에 수행하세요:
1) 가상 소개팅 상대로서 사용자의 마지막 발화에 자연스럽게 대답합니다 (${personaHint}).
2) 코치로서 사용자의 발화를 구체적으로 평가합니다.

규칙:
- 한국어, 친근하고 자연스러운 구어체.
- partnerReply는 1-2문장, 실제 사람이 대답하듯 자연스럽게. 절대 평가/조언/메타발언 금지.
- feedback은 2-3문장, 무엇이 왜 좋았고 왜 아쉬웠는지 구체적으로.
- good/improve는 추상적 표현("좋아요","더 자연스럽게") 금지. 사용자의 실제 문장을 인용/지적하면서 구체적으로.
- suggestions는 사용자가 다음 턴에 그대로 보낼 수 있는 완성된 멘트 2-3개.
- JSON 외 텍스트 절대 금지.`,
        },
        {
          role: "user",
          content: `${history ? `[지금까지의 대화]\n${history}\n\n` : ""}[사용자의 이번 발화]\n"${data.message}"

아래 JSON 스키마로만 응답:
{
  "partnerReply": "<소개팅 상대가 사용자에게 건네는 자연스러운 대답 1-2문장>",
  "feedback": "<코치의 종합 평가 2-3문장>",
  "good": ["<구체적으로 잘한 점 1-3개>"],
  "improve": ["<구체적으로 개선할 점 1-3개>"],
  "suggestions": ["<다음 턴에 보낼 만한 완성된 멘트 2-3개>"]
}`,
        },
      ],
    });

    return parseJsonLoose<ChatPracticeResult>(content, {
      partnerReply: "음, 그렇군요. 좀 더 듣고 싶어요!",
      feedback: "좋은 시도예요. 조금 더 구체적인 이야기를 더해보면 대화가 풍성해질 거예요.",
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
  priceRange: string;
  menuExamples: string[];
  imageQuery: string;
}

export const recommendPlacesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { area: string; category: string; priceRange?: string; mood?: string }) => input)
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
${data.priceRange ? `가격대: ${data.priceRange}. ` : ""}${data.mood ? `분위기: ${data.mood}. ` : ""}3개는 메인(카페·식당), 1개는 애프터(와인바·디저트). 아래 JSON 스키마로만:
{
  "places": [
    {
      "name": "<실제 가게 이름>",
      "category": "카페" | "레스토랑" | "와인바" | "액티비티",
      "address": "<도로명 주소>",
      "distanceKm": <0.3~3.0>,
      "rating": <4.0~4.9>,
      "reviewCount": <100~3000>,
      "lat": <위도>,
      "lng": <경도>,
      "isAfter": <bool>,
      "reason": "<소개팅에 좋은 이유 한 줄>",
      "priceRange": "<1인 가격대, 예: '1.5만~2.5만원'>",
      "menuExamples": ["<대표 메뉴 2-3개>"],
      "imageQuery": "<영문 unsplash 검색어, 예: 'cozy seoul cafe interior'>"
    }
  ]
}`,
        },
      ],
    });

    const parsed = parseJsonLoose<{ places: Omit<AiPlace, "id">[] }>(content, { places: [] });
    return parsed.places.map((p, i) => ({ ...p, id: `ai-${Date.now()}-${i}` }));
  });

// ── 4. 데이트 룩 추천 ──────────────────────────────
export interface LookRecommendation {
  title: string;
  summary: string;
  items: { category: string; description: string; color: string }[];
  tips: string[];
}

export const recommendLookFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    gender: "M" | "F";
    weather: "sunny" | "cloudy" | "rainy";
    place: string;
    vibe: string;
  }) => input)
  .handler(async ({ data }): Promise<LookRecommendation> => {
    const weatherLabel = data.weather === "sunny" ? "맑음" : data.weather === "cloudy" ? "흐림" : "비";
    const genderLabel = data.gender === "M" ? "남성" : "여성";
    const content = await callAiGateway({
      responseFormat: "json_object",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "당신은 한국의 데이트 룩 스타일리스트입니다. 결과는 JSON으로만 답하고, 친근한 한국어로 작성합니다.",
        },
        {
          role: "user",
          content: `오늘 ${weatherLabel} 날씨에 ${data.place}에서 만나는 ${genderLabel}을(를) 위해 "${data.vibe}" 분위기의 데이트 룩을 추천하세요. JSON 스키마:
{
  "title": "<코디 이름>",
  "summary": "<2-3문장의 코디 소개>",
  "items": [{"category": "<상의/하의/아우터/신발/액세서리 등>", "description": "<구체 아이템 한 줄>", "color": "<색상>"}],
  "tips": ["<스타일링 팁 2-3개>"]
}`,
        },
      ],
    });
    return parseJsonLoose<LookRecommendation>(content, {
      title: "데일리 룩",
      summary: "편안하고 단정한 데이트 룩이에요.",
      items: [],
      tips: [],
    });
  });
