import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import {
  Shirt,
  Sparkles,
  Sun,
  Cloud,
  CloudRain,
  RotateCw,
  Coffee,
  UtensilsCrossed,
  Wine,
  Image as ImageIcon,
  Trees,
  Footprints,
  ShoppingBag,
  Glasses,
  Watch,
  Gem,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { api } from "@/lib/api";
import type { LookRecommendation } from "@/lib/ai.functions";

export const Route = createFileRoute("/coach/look")({
  head: () => ({
    meta: [
      { title: "오늘의 데이트 룩 — 로테이트" },
      { name: "description", content: "날씨와 장소, 분위기에 어울리는 코디를 골라보세요." },
    ],
  }),
  component: LookCoach,
});

// 날씨별 색 정체성(아이콘 accent) + 패널 하늘 그라데이션.
const WEATHERS = [
  {
    id: "sunny",
    label: "맑음",
    icon: Sun,
    accent: "#E59A1B",
    sky: "linear-gradient(165deg, #7FC0EC 0%, #AED8EE 55%, #FCE7BE 100%)",
  },
  {
    id: "cloudy",
    label: "흐림",
    icon: Cloud,
    accent: "#5B6B7E",
    sky: "linear-gradient(165deg, #94A4B6 0%, #C0CAD6 60%, #DCE2E9 100%)",
  },
  {
    id: "rainy",
    label: "비",
    icon: CloudRain,
    accent: "#3E5168",
    sky: "linear-gradient(165deg, #46566B 0%, #637388 60%, #8492A6 100%)",
  },
] as const;

type Weather = (typeof WEATHERS)[number];
type WeatherId = Weather["id"];

// SSR 하이드레이션 안정성을 위해 빗방울 위치/속도는 고정값 사용(Math.random 금지).
const RAINDROPS = [
  { left: "10%", dur: "0.7s", delay: "0s" },
  { left: "22%", dur: "0.95s", delay: "0.25s" },
  { left: "34%", dur: "0.8s", delay: "0.1s" },
  { left: "47%", dur: "1.05s", delay: "0.4s" },
  { left: "58%", dur: "0.75s", delay: "0.15s" },
  { left: "69%", dur: "0.9s", delay: "0.35s" },
  { left: "80%", dur: "0.82s", delay: "0.05s" },
  { left: "90%", dur: "1s", delay: "0.5s" },
];

const PLACES: { label: string; icon: LucideIcon }[] = [
  { label: "카페", icon: Coffee },
  { label: "레스토랑", icon: UtensilsCrossed },
  { label: "와인바", icon: Wine },
  { label: "전시·미술관", icon: ImageIcon },
  { label: "공원·산책", icon: Trees },
];

const VIBES = ["캐주얼", "스마트 캐주얼", "포멀", "스트릿", "러블리"];
const GENDERS: { id: "M" | "F"; label: string }[] = [
  { id: "M", label: "남성" },
  { id: "F", label: "여성" },
];

// 색 이름(한/영) → 실제 색. 룩 추천에서 색을 글자가 아니라 눈으로 보게 한다.
// 더 구체적인 색을 먼저 매칭(라이트핑크 → 핑크 순).
const COLOR_SWATCHES: { keys: string[]; hex: string }[] = [
  { keys: ["라이트핑크", "베이비핑크"], hex: "#F8C8D8" },
  { keys: ["핑크", "로즈", "pink"], hex: "#F0A2BC" },
  { keys: ["코랄", "coral"], hex: "#F0805E" },
  { keys: ["버건디", "와인", "burgundy"], hex: "#6E2433" },
  { keys: ["레드", "빨강", "red"], hex: "#C0392B" },
  { keys: ["오렌지", "주황", "orange"], hex: "#E5843C" },
  { keys: ["머스타드", "mustard"], hex: "#D4A017" },
  { keys: ["옐로우", "노랑", "yellow"], hex: "#E6C046" },
  { keys: ["민트", "mint"], hex: "#9DE0C0" },
  { keys: ["올리브", "olive"], hex: "#6B7A3A" },
  { keys: ["카키", "khaki"], hex: "#7C7A4E" },
  { keys: ["그린", "초록", "green"], hex: "#4E8A57" },
  { keys: ["네이비", "남색", "navy"], hex: "#22395C" },
  { keys: ["데님", "denim"], hex: "#3B5C84" },
  { keys: ["스카이", "하늘"], hex: "#7FB6E6" },
  { keys: ["블루", "파랑", "blue"], hex: "#4A7FC0" },
  { keys: ["라벤더", "lavender"], hex: "#C3B0E6" },
  { keys: ["퍼플", "보라", "바이올렛", "purple"], hex: "#9B7BD4" },
  { keys: ["카멜", "camel"], hex: "#B58A50" },
  { keys: ["브라운", "갈색", "초콜릿", "brown"], hex: "#6B4F3A" },
  { keys: ["베이지", "샌드", "beige"], hex: "#D8C4A8" },
  { keys: ["크림", "아이보리", "ivory", "cream"], hex: "#F1EADA" },
  { keys: ["차콜", "charcoal"], hex: "#3A3D42" },
  { keys: ["블랙", "검정", "먹", "black"], hex: "#222222" },
  { keys: ["다크그레이", "진회색"], hex: "#6B7280" },
  { keys: ["라이트그레이", "연회색"], hex: "#D6D9DE" },
  { keys: ["그레이", "회색", "gray", "grey"], hex: "#9AA0A8" },
  { keys: ["실버", "silver"], hex: "#C7CBD1" },
  { keys: ["골드", "gold"], hex: "#CBA13A" },
  { keys: ["화이트", "흰", "white"], hex: "#FFFFFF" },
];

function colorToHex(name: string): string {
  const n = name.toLowerCase();
  for (const c of COLOR_SWATCHES) if (c.keys.some((k) => n.includes(k.toLowerCase()))) return c.hex;
  return "#CBBEDF"; // 매칭 실패 시 중립 톤
}

// lucide엔 의류 아이콘이 Shirt뿐이라, 하의(바지)·아우터(코트)는 lucide 스타일
// (24×24, stroke 2, round, currentColor)에 맞춰 직접 그려 카테고리를 구분한다.
type CatIcon = React.ComponentType<{ size?: number; className?: string }>;

function svgProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
}

function PantsIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <path d="M6 3h12v4l-1 14h-4l-1-10-1 10H7L6 7z" />
      <path d="M6 3h12" />
    </svg>
  );
}

function CoatIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <path d="M8 3 4 6l2 4v11h12V10l2-4-4-3-4 5z" />
      <path d="m8 3 4 5 4-5" />
      <path d="M12 8v13" />
    </svg>
  );
}

// 카테고리(자유 텍스트) 분류 정규식. 아이콘 표시(categoryIcon)와 픽셀 캐릭터
// 슬롯 매핑(classifySlot)이 같은 규칙을 공유하도록 한 곳에 모은다.
const CAT_RE = {
  shoe: /신발|슈즈|스니커|구두|로퍼|부츠|샌들|힐|shoe|sneaker|boot/,
  bag: /가방|백팩|클러치|토트|크로스|bag/,
  glass: /안경|선글라스|glass/,
  watch: /시계|워치|watch/,
  outer: /아우터|자켓|재킷|코트|가디건|패딩|점퍼|블레이저|야상|트렌치|coat|jacket/,
  bottom:
    /하의|팬츠|바지|슬랙스|슬렉스|청바지|진|데님|스커트|치마|반바지|쇼츠|조거|pant|trouser|skirt/,
  accessory: /액세서리|주얼리|목걸이|귀걸이|반지|팔찌|모자|벨트|스카프|accessor|jewel/,
};

// 카테고리 → 아이콘. 색 원이 행의 메인 리딩 요소이고, 아이콘은 카테고리를 빠르게
// 식별하게 돕는 보조 표식이다.
function categoryIcon(category: string): CatIcon {
  const c = category.toLowerCase();
  if (CAT_RE.shoe.test(c)) return Footprints;
  if (CAT_RE.bag.test(c)) return ShoppingBag;
  if (CAT_RE.glass.test(c)) return Glasses;
  if (CAT_RE.watch.test(c)) return Watch;
  if (CAT_RE.outer.test(c)) return CoatIcon;
  if (CAT_RE.bottom.test(c)) return PantsIcon;
  if (CAT_RE.accessory.test(c)) return Gem;
  return Shirt;
}

// 픽셀 캐릭터 슬롯. 캐릭터엔 핵심 4종(상의/하의/아우터/신발)만 입히고,
// 가방·안경·시계·주얼리 등 액세서리는 캐릭터에 그리지 않는다(null = 리스트에만 유지).
type Slot = "top" | "bottom" | "outer" | "shoe";

function classifySlot(category: string): Slot | null {
  const c = category.toLowerCase();
  if (CAT_RE.shoe.test(c)) return "shoe";
  if (
    CAT_RE.bag.test(c) ||
    CAT_RE.glass.test(c) ||
    CAT_RE.watch.test(c) ||
    CAT_RE.accessory.test(c)
  )
    return null;
  if (CAT_RE.outer.test(c)) return "outer";
  if (CAT_RE.bottom.test(c)) return "bottom";
  return "top"; // 상의가 기본값(categoryIcon과 동일한 우선순위)
}

// ── 미니멀 도트 픽셀 캐릭터 ──────────────────────────────────────────────
// 24×36 셀 고해상도 매트릭스. 각 글자가 part를 가리키고, 렌더 시 part→hex 팔레트로
// 색을 주입한다. 셀이 작아져 도트가 더 촘촘하고, 늘어난 해상도로 머리·어깨·턱 외곽의
// 계단을 픽셀 단위로 다듬어 경직된 직사각형 느낌을 덜어냈다(anti-alias 없이 crispEdges).
//   O 외곽선 · X 눈 · H 머리 · S 피부 · P 볼터치(고정)
//   T 상의 · K 아우터(있으면)/없으면 상의색 · B 하의 · F 신발 (메인 색은 colorToHex 그대로)
//   소문자 t·k·b·f = 각 슬롯의 음영(카라·소매선·밑단·밑창). 메인 색을 shade()로 살짝
//   어둡게 깐 1px 라인이라 단조로운 색면을 끊어주되 리스트 색 원의 hex는 건드리지 않는다.
// 'K'(어깨/소매)는 아우터가 있으면 아우터색, 없으면 상의색으로 떨어져 아우터가 상의 위
// 레이어로 보이게 한다. 새 이미지 자산 0개.
const PIXEL_M = [
  "........................",
  "........................",
  ".......OOOOOOOOOO.......",
  "......OHHHHHHHHHHO......",
  ".....OHHHHHHHHHHHHO.....",
  ".....OHHHHHHHHHHHHO.....",
  ".....OHSSSSSSSSSSHO.....",
  ".....OHSSSSSSSSSSHO.....",
  ".....OSSSSSSSSSSSSO.....",
  ".....OSSXSSSSSSXSSO.....",
  ".....OSSSSSSSSSSSSO.....",
  ".....OSPSSSSSSSSPSO.....",
  ".....OSSSSSSSSSSSSO.....",
  "......OSSSSSSSSSSO......",
  ".......OSSSSSSSSO.......",
  ".........OSSSSO.........",
  "......OKKtSSSStKKO......",
  "...OKKKTtTTTTTTtTKKKO...",
  "...OKKkTTTTTTTTTTkKKO...",
  "...OKKkTTTTTTTTTTkKKO...",
  "...OKKkTTTTTTTTTTkKKO...",
  "...OKKkTTTTTTTTTTkKKO...",
  "...OKKkTTTTTTTTTTkKKO...",
  "...OSSkTTTTTTTTTTkSSO...",
  "......OttttttttttO......",
  "......ObbbbbbbbbbO......",
  "......OBBBBOOBBBBO......",
  "......OBBBBOOBBBBO......",
  "......OBBBBOOBBBBO......",
  "......OBBBBOOBBBBO......",
  "......OBBBBOOBBBBO......",
  "......OBBBBOOBBBBO......",
  "......ObbbbOObbbbO......",
  "......OFFFFOOFFFFO......",
  ".....OFFFFFOOFFFFFO.....",
  ".....OfffffOOfffffO.....",
];

// 여성 베이스: 옆으로 흘러내리는 머리(H)가 어깨까지 흐르고, A라인 스커트 +
// 가는 다리 실루엣. 남성보다 턱선·어깨를 한 픽셀씩 더 둥글려 부드럽게.
const PIXEL_F = [
  "........................",
  "........................",
  ".......OOOOOOOOOO.......",
  "......OHHHHHHHHHHO......",
  ".....OHHHHHHHHHHHHO.....",
  ".....OHHHHHHHHHHHHO.....",
  ".....OHHSSSSSSSSHHO.....",
  ".....OHHSSSSSSSSHHO.....",
  ".....OHSSSSSSSSSSHO.....",
  ".....OHSXSSSSSSXSHO.....",
  ".....OHSSSSSSSSSSHO.....",
  ".....OHPSSSSSSSSPHO.....",
  ".....OHSSSSSSSSSSHO.....",
  ".....OHHSSSSSSSSHHO.....",
  ".....OHHHSSSSSSHHHO.....",
  ".....OHHHHSSSSHHHHO.....",
  "...OHHKKtSSSSSStKKHHO...",
  "...OHHKTtTTTTTTtTKHHO...",
  "...OHKkTTTTTTTTTTkKHO...",
  "...OKKkTTTTTTTTTTkKKO...",
  "...OKKkTTTTTTTTTTkKKO...",
  "...OKKkTTTTTTTTTTkKKO...",
  "...OKKkTTTTTTTTTTkKKO...",
  "...OSSkTTTTTTTTTTkSSO...",
  "......OttttttttttO......",
  "......ObbbbbbbbbbO......",
  "......OBBBBBBBBBBO......",
  ".....OBBBBBBBBBBBBO.....",
  "....OBBBBBBBBBBBBBBO....",
  "...ObbbbbbbbbbbbbbbbO...",
  "......OSSSO..OSSSO......",
  "......OSSSO..OSSSO......",
  "......OSSSO..OSSSO......",
  ".....OFFFFO..OFFFFO.....",
  "....OFFFFFO..OFFFFFO....",
  "....OfffffO..OfffffO....",
];

// 고정 파트 팔레트(피부·머리·외곽선·볼터치). 추천 색과 무관하게 항상 동일.
const PX_FIXED = {
  outline: "#322E2B",
  skin: "#F2C6A0",
  hair: "#463A30",
  blush: "#F2A9BC",
};

// 해당 슬롯 추천이 없을 때의 중립 베이스 색(깨지지 않게, 옷처럼 보이게).
const PX_NEUTRAL = { top: "#C9CDD4", bottom: "#9AA0A8", shoe: "#5E636B" };

type SlotPalette = { top: string; bottom: string; shoe: string; outer: string | null };

const SLOT_LABEL: Record<Slot, string> = {
  outer: "아우터",
  top: "상의",
  bottom: "하의",
  shoe: "신발",
};

// items → 슬롯 팔레트 + 레전드. 같은 슬롯 중복 시 첫 매칭 우선.
// 슬롯 색은 반드시 colorToHex()로 변환해 아래 리스트의 색 원과 hex가 동일하게 보장.
function buildLook(items: { category: string; color: string }[]) {
  const palette: SlotPalette = {
    top: PX_NEUTRAL.top,
    bottom: PX_NEUTRAL.bottom,
    shoe: PX_NEUTRAL.shoe,
    outer: null,
  };
  const filled = new Set<Slot>();
  for (const it of items) {
    const s = classifySlot(it.category);
    if (!s || filled.has(s)) continue;
    palette[s] = colorToHex(it.color);
    filled.add(s);
  }
  // 위→아래(아우터·상의·하의·신발) 순으로, 추천이 있는 슬롯만 레전드에 노출.
  const legend = (["outer", "top", "bottom", "shoe"] as Slot[])
    .filter((s) => filled.has(s))
    .map((s) => ({ slot: s, label: SLOT_LABEL[s], hex: palette[s] as string }));
  return { palette, legend };
}

// 슬롯 메인 색을 살짝 어둡게 만든 음영 톤(카라·소매선·밑단·밑창 1px 라인용).
// 리스트의 색 원과 hex가 같아야 하는 건 메인(대문자)뿐이라, 음영은 여기서만 파생한다.
function shade(hex: string, amt = 0.82): string {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.replace(/(.)/g, "$1$1") : m;
  const ch = (i: number) => Math.round(parseInt(full.slice(i, i + 2), 16) * amt);
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${h(ch(0))}${h(ch(2))}${h(ch(4))}`;
}

function pixelColor(ch: string, palette: SlotPalette): string | null {
  switch (ch) {
    case "O":
    case "X":
      return PX_FIXED.outline;
    case "H":
      return PX_FIXED.hair;
    case "S":
      return PX_FIXED.skin;
    case "P":
      return PX_FIXED.blush;
    case "T":
      return palette.top;
    case "K":
      return palette.outer ?? palette.top; // 아우터 없으면 상의색으로
    case "B":
      return palette.bottom;
    case "F":
      return palette.shoe;
    // 소문자 = 음영 라인(메인 색을 shade로 살짝 어둡게)
    case "t":
      return shade(palette.top);
    case "k":
      return shade(palette.outer ?? palette.top);
    case "b":
      return shade(palette.bottom);
    case "f":
      return shade(palette.shoe);
    default:
      return null; // 빈 셀
  }
}

// 정적 SVG <rect> 그리드. shape-rendering=crispEdges로 anti-alias 없이 픽셀 또렷.
function PixelCharacter({
  gender,
  palette,
  cell = 6,
}: {
  gender: "M" | "F";
  palette: SlotPalette;
  cell?: number;
}) {
  const matrix = gender === "F" ? PIXEL_F : PIXEL_M;
  const cols = matrix[0].length;
  const rows = matrix.length;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++) {
    const row = matrix[y];
    for (let x = 0; x < row.length; x++) {
      const fill = pixelColor(row[x], palette);
      if (!fill) continue;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
    }
  }
  return (
    <svg
      width={cols * cell}
      height={rows * cell}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`${gender === "F" ? "여성" : "남성"} 픽셀 캐릭터가 추천 색상의 코디를 입은 미리보기`}
    >
      {rects}
    </svg>
  );
}

// 결과 상단 히어로: 하늘을 크게 열어두고 캐릭터 옷 색 충실도는 두 장치로 보호.
// ① 소프트 radial glow — 캐릭터 실루엣 뒤에 경계 없는 흰 빛이 배경색을 밀어내
//    어두운 비 하늘(#46566B)에서도 슬롯 색이 분리돼 읽힌다.
// ② 타원 무대 바닥 — 발치 아래에만 밝은 타원이 위로 fade, 캐릭터를 바닥에 안착.
// 큰 흰 패널 없이 하늘/날씨 FX가 시원하게 드러나고, 라벨·레전드는
// 각각 반투명 pill 형태로 어느 날씨에서나 독립적 대비 확보.
function LookHero({
  gender,
  items,
  weather,
}: {
  gender: "M" | "F";
  items: { category: string; description: string; color: string }[];
  weather: WeatherId;
}) {
  const { palette, legend } = buildLook(items);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border shadow-card">
      {/* 하늘 레이어 — 날씨 전환 시 crossfade (입력존과 동일 패턴) */}
      {WEATHERS.map((w) => (
        <div
          key={w.id}
          aria-hidden
          className="absolute inset-0 transition-opacity duration-500 ease-out"
          style={{ background: w.sky, opacity: weather === w.id ? 1 : 0 }}
        />
      ))}

      {/* 날씨 FX — 입력존보다 절제된 강도(45%)로 배경 분위기만 살짝 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ opacity: 0.45 }}
      >
        <WeatherFX weather={weather} />
      </div>

      {/* 컨텐츠 레이어 */}
      <div className="relative flex flex-col items-center px-4 pt-4 pb-5">
        {/* 라벨 — 반투명 pill로 어느 하늘에서나 핑크+대비 유지 */}
        <div
          className="mb-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide text-pink backdrop-blur-sm"
          style={{ background: "rgba(255,255,255,0.72)" }}
        >
          <Sparkles size={12} />
          추천 룩 미리보기
        </div>

        {/* 캐릭터 + 소프트 후광 */}
        <div className="relative">
          {/* Radial glow — 경계 없는 흰 빛이 옷 슬롯 색을 하늘에서 분리 */}
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              inset: "-36px -44px",
              zIndex: 0,
              background:
                "radial-gradient(ellipse at 50% 46%, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.30) 44%, rgba(255,255,255,0.08) 65%, transparent 80%)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <PixelCharacter gender={gender} palette={palette} cell={6} />
          </div>
        </div>

        {/* 타원 무대 바닥 — 발치만 밝고 위로 갈수록 fade(기존 foot shadow 대체) */}
        <div
          aria-hidden
          style={{
            width: "168px",
            height: "24px",
            marginTop: "-4px",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 50% 80%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.36) 52%, transparent 78%)",
          }}
        />

        {/* 레전드 — 하늘 위에 뜨는 반투명 pill 칩 */}
        {legend.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {legend.map((l) => (
              <span
                key={l.slot}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.76)" }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ background: l.hex }}
                />
                {l.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LookCoach() {
  const [gender, setGender] = useState<"M" | "F">("M");
  const [weather, setWeather] = useState<"sunny" | "cloudy" | "rainy">("sunny");
  const [place, setPlace] = useState("카페");
  const [vibe, setVibe] = useState("스마트 캐주얼");
  const resultRef = useRef<HTMLDivElement>(null);

  const rec = useMutation({
    mutationFn: () => api.recommendLook({ gender, weather, place, vibe }),
  });

  // 결과/로딩이 화면 밖 아래에 생성돼도 사용자가 인지하도록 스크롤로 이동.
  useEffect(() => {
    if (!rec.isPending && !rec.data) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [rec.isPending, rec.data]);

  const weatherLabel = WEATHERS.find((w) => w.id === weather)?.label ?? "";
  const genderLabel = gender === "M" ? "남성" : "여성";

  return (
    <PhoneShell>
      <NavHeader back backTo="/coach" title="오늘 데이트 룩 추천" />
      <div className="scroll-area bg-surface">
        {/* 흰 캔버스 + 카드 시스템. 날씨는 자기 카드 안에만 색을 담아 톤을 고정한다. */}
        <div className="space-y-4 px-4 pb-20 pt-4">
          {/* 오늘의 날씨: 하늘이 카드 안에만 클립되는 포함형 위젯 */}
          <WeatherCard weather={weather} onSelect={setWeather} />

          <GenderToggle gender={gender} onChange={setGender} />

          {/* 데이트 무드: 장소·분위기를 같은 칩 어휘로 통일 */}
          <Group title="데이트 무드">
            <Field label="장소">
              <div className="flex flex-wrap gap-2">
                {PLACES.map(({ label, icon }) => (
                  <Chip
                    key={label}
                    active={place === label}
                    icon={icon}
                    onClick={() => setPlace(label)}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="분위기">
              <div className="flex flex-wrap gap-2">
                {VIBES.map((v) => (
                  <Chip key={v} active={vibe === v} onClick={() => setVibe(v)}>
                    {v}
                  </Chip>
                ))}
              </div>
            </Field>
          </Group>

          {/* 옵션이 길어 CTA가 밀려나므로 하단 고정 바로 올리고, 선택 요약을 함께 보여준다. */}
          <div
            className="sticky z-10 -mx-4 border-t border-border/70 bg-surface/85 px-4 pt-2.5 pb-3 backdrop-blur-sm"
            style={{ bottom: "calc(68px + env(safe-area-inset-bottom))" }}
          >
            <div className="mb-2 flex flex-wrap items-center justify-center gap-x-1.5 text-[11px] text-text-2">
              {/* key를 값으로 줘서 선택이 바뀌면 토큰만 리마운트 → 부드럽게 페이드 인 */}
              <span
                key={weatherLabel}
                className="inline-block font-semibold text-text-1 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
              >
                {weatherLabel}
              </span>
              <span className="text-text-3">·</span>
              <span key={place} className="inline-block motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
                {place}
              </span>
              <span className="text-text-3">·</span>
              <span key={vibe} className="inline-block motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
                {vibe}
              </span>
              <span className="text-text-3">·</span>
              <span key={genderLabel} className="inline-block motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
                {genderLabel}
              </span>
            </div>
            <button
              onClick={() => rec.mutate()}
              disabled={rec.isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-pink text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(255,75,123,0.32)] transition duration-200 ease-out motion-safe:active:scale-[0.99] disabled:opacity-60"
            >
              {rec.isPending ? (
                <>
                  <RotateCw size={16} className="animate-spin" />
                  코디 추천 중…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  {rec.data ? "다른 코디 추천받기" : "AI 룩 추천 받기"}
                </>
              )}
            </button>

            {rec.isError && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                <span className="truncate">{(rec.error as Error).message}</span>
                <button
                  onClick={() => rec.mutate()}
                  className="flex shrink-0 items-center gap-1 font-semibold text-rose-700 underline"
                >
                  <RotateCw size={12} />
                  다시 시도
                </button>
              </div>
            )}
          </div>

          <div ref={resultRef} className="mt-4 scroll-mt-4">
            {rec.isPending ? (
              <LookSkeleton />
            ) : rec.data ? (
              <Result data={rec.data} gender={gender} weather={weather} />
            ) : (
              !rec.isError && <LookHint />
            )}
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[13px] font-semibold text-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[12px] font-medium text-text-2">{label}</div>
      {children}
    </div>
  );
}

// 풀블리드 스카이 헤더: 선택한 날씨의 하늘이 화면 상단을 채우고,
// 하단은 pink-light로 페이드되어 페이지와 자연스럽게 이어진다(섬처럼 보이지 않게).
// 포함형 날씨 위젯 카드: 하늘은 카드 안에만 클립되고, 페이지(흰색)는 영향을 안 받는다.
// 결과 카드와 같은 카드 어휘(rounded/border/shadow)로 묶여 톤이 안정된다.
function WeatherCard({
  weather,
  onSelect,
}: {
  weather: WeatherId;
  onSelect: (id: WeatherId) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border shadow-card">
      {/* 하늘+모션: 카드 표면 전체를 채우는 선택 날씨의 하늘 */}
      <div className="absolute inset-0">
        {WEATHERS.map((w) => (
          <div
            key={w.id}
            aria-hidden
            className="absolute inset-0 transition-opacity duration-500 ease-out"
            style={{ background: w.sky, opacity: weather === w.id ? 1 : 0 }}
          />
        ))}
        <WeatherFX weather={weather} />
      </div>
      <div className="relative px-3.5 pb-3.5 pt-3">
        <div className="mb-2.5 text-[13px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.3)]">
          오늘의 날씨
        </div>
        <div className="grid grid-cols-3 gap-2">
          {WEATHERS.map((w) => (
            <WeatherTile
              key={w.id}
              theme={w}
              active={weather === w.id}
              onClick={() => onSelect(w.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeatherTile({
  theme,
  active,
  onClick,
}: {
  theme: Weather;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = theme.icon;
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      // 선택: 흰 카드가 떠오르고(scale+그림자) 그 날씨색 링으로 못박음.
      // 비선택: 더 투명하게 가라앉혀 선택이 대비로 도드라지게.
      className={`relative flex flex-col items-center gap-1.5 rounded-xl py-4 text-sm transition duration-200 ease-out motion-safe:active:scale-[0.97] ${
        active
          ? "bg-white font-bold text-slate-900 motion-safe:scale-[1.05]"
          : "border border-white/40 bg-white/30 font-semibold text-slate-700 backdrop-blur-sm"
      }`}
      style={
        active
          ? { boxShadow: `0 8px 20px rgba(0,0,0,0.18), 0 0 0 2px ${theme.accent}` }
          : undefined
      }
    >
      <Icon
        size={22}
        style={{ color: theme.accent }}
        className={active ? "" : "opacity-75"}
      />
      {theme.label}
    </button>
  );
}

// 선택된 날씨의 분위기 모션. 모든 키프레임은 styles.css에 정의되어 있고,
// prefers-reduced-motion 환경에서는 거기서 애니메이션이 꺼진다.
function WeatherFX({ weather }: { weather: WeatherId }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {weather === "sunny" && <div className="weather-sun" />}
      {weather === "cloudy" && (
        <>
          <div className="weather-cloud weather-cloud--a" />
          <div className="weather-cloud weather-cloud--b" />
        </>
      )}
      {weather === "rainy" && (
        <div className="weather-rain absolute inset-0">
          {RAINDROPS.map((d, i) => (
            <span
              key={i}
              style={{ left: d.left, animationDuration: d.dur, animationDelay: d.delay }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GenderToggle({
  gender,
  onChange,
}: {
  gender: "M" | "F";
  onChange: (g: "M" | "F") => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-3.5 py-2.5">
      <span className="text-[13px] font-medium text-text-2">성별</span>
      <div className="flex rounded-full bg-surface-2 p-0.5">
        {GENDERS.map((g) => (
          <button
            key={g.id}
            onClick={() => onChange(g.id)}
            aria-pressed={gender === g.id}
            className={`rounded-full px-4 py-1.5 text-[12px] transition duration-200 ease-out motion-safe:active:scale-[0.97] ${
              gender === g.id
                ? "bg-pink font-semibold text-white shadow-[0_2px_8px_rgba(255,75,123,0.4)]"
                : "font-medium text-text-2"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border-[1.5px] px-4 text-[13px] transition duration-200 ease-out motion-safe:active:scale-[0.97] ${
        active
          ? "border-pink bg-pink font-semibold text-white shadow-[0_4px_14px_rgba(255,75,123,0.4)] motion-safe:scale-[1.04]"
          : "border-border bg-surface font-medium text-text-2"
      }`}
    >
      {Icon && <Icon size={15} className={active ? "text-white" : "text-text-3"} />}
      {children}
    </button>
  );
}

function LookHint() {
  return (
    <div className="rounded-2xl border border-dashed border-pink-mid bg-surface p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pink-light">
        <Shirt size={22} className="text-pink" />
      </div>
      <div className="mt-3 text-[14px] font-semibold leading-snug text-foreground">
        날씨·장소·분위기를 고르면
        <br />
        AI가 오늘의 데이트 룩을 제안해요
      </div>
      <p className="mx-auto mt-2 max-w-[260px] text-[12px] leading-relaxed text-text-2">
        상의·하의·아우터·신발·액세서리 코디와 색 조합, 스타일링 팁까지 한 번에 받아보세요.
      </p>
    </div>
  );
}

function LookSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex items-center gap-2 px-1 text-[13px] font-medium text-text-2">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-pink" />
        AI가 오늘의 코디를 고르는 중…
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 animate-pulse rounded-full bg-pink-mid" />
          <div className="h-4 w-32 animate-pulse rounded bg-black/[0.06]" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-black/[0.06]" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-black/[0.06]" />
        </div>
      </div>
      <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-surface">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-black/[0.06]" />
            <div className="min-w-0 flex-1">
              <div className="h-3.5 w-20 animate-pulse rounded bg-black/[0.06]" />
              <div className="mt-1.5 h-3 w-3/4 animate-pulse rounded bg-black/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Result({
  data,
  gender,
  weather,
}: {
  data: LookRecommendation;
  gender: "M" | "F";
  weather: WeatherId;
}) {
  return (
    <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-300 motion-safe:ease-out">
      {/* 추천 색을 입은 미니멀 도트 캐릭터 — 결과 상단 히어로 */}
      {data.items.length > 0 && <LookHero gender={gender} items={data.items} weather={weather} />}

      {/* 룩 소개: 결과의 메인 헤더 */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink/10">
            <Shirt size={15} className="text-pink" />
          </span>
          <div className="text-[15px] font-semibold leading-tight">{data.title}</div>
        </div>
        <p className="mt-2.5 text-[13px] leading-relaxed text-text-2">{data.summary}</p>
      </div>

      {/* 코디 아이템: 낱개 카드가 아니라 하나의 룩 카드 안에서 행으로 구분.
          색 원이 행의 리딩 요소이고, 색 이름은 우측에 보조 표기한다. */}
      {data.items.length > 0 && (
        <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-surface">
          {data.items.map(
            (it: { category: string; description: string; color: string }, i: number) => {
              const Icon = categoryIcon(it.category);
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="h-9 w-9 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ background: colorToHex(it.color) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Icon size={13} className="shrink-0 text-text-3" />
                      <span className="text-[13px] font-semibold">{it.category}</span>
                      <span className="ml-auto shrink-0 pl-2 text-[11px] font-medium text-text-2">
                        {it.color}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-snug text-text-2">{it.description}</p>
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}

      {/* 스타일링 팁: 페이지 톤(pink)과 일관되게 — 흰 카드 + pink accent */}
      {data.tips && data.tips.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-pink" />
            <div className="text-[13px] font-semibold text-pink">스타일링 팁</div>
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {data.tips.map((t: string, i: number) => (
              <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-text-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-pink/60" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
