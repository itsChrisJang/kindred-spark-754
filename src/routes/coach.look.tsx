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
  for (const c of COLOR_SWATCHES)
    if (c.keys.some((k) => n.includes(k.toLowerCase()))) return c.hex;
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

// 카테고리 → 아이콘. 색 원이 행의 메인 리딩 요소이고, 아이콘은 카테고리를 빠르게
// 식별하게 돕는 보조 표식이다.
function categoryIcon(category: string): CatIcon {
  const c = category.toLowerCase();
  if (/신발|슈즈|스니커|구두|로퍼|부츠|샌들|힐|shoe|sneaker|boot/.test(c)) return Footprints;
  if (/가방|백팩|클러치|토트|크로스|bag/.test(c)) return ShoppingBag;
  if (/안경|선글라스|glass/.test(c)) return Glasses;
  if (/시계|워치|watch/.test(c)) return Watch;
  if (/아우터|자켓|재킷|코트|가디건|패딩|점퍼|블레이저|야상|트렌치|coat|jacket/.test(c))
    return CoatIcon;
  if (/하의|팬츠|바지|슬랙스|슬렉스|청바지|진|데님|스커트|치마|반바지|쇼츠|조거|pant|trouser|skirt/.test(c))
    return PantsIcon;
  if (/액세서리|주얼리|목걸이|귀걸이|반지|팔찌|모자|벨트|스카프|accessor|jewel/.test(c))
    return Gem;
  return Shirt;
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
        <div className="space-y-4 px-4 pb-4 pt-4">
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
              <span className="font-semibold text-text-1">{weatherLabel}</span>
              <span className="text-text-3">·</span>
              <span>{place}</span>
              <span className="text-text-3">·</span>
              <span>{vibe}</span>
              <span className="text-text-3">·</span>
              <span>{genderLabel}</span>
            </div>
            <button
              onClick={() => rec.mutate()}
              disabled={rec.isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-pink text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(255,75,123,0.32)] transition active:scale-[0.99] disabled:opacity-60"
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
              <Result data={rec.data} />
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
      <div className="mb-2 text-[12px] font-medium text-text-3">{label}</div>
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
      className={`relative flex flex-col items-center gap-1.5 rounded-xl py-4 text-sm font-semibold transition ${
        active
          ? "bg-white text-slate-800 shadow-[0_4px_14px_rgba(0,0,0,0.16)] ring-1 ring-black/5"
          : "border border-white/40 bg-white/30 text-slate-600 backdrop-blur-sm"
      }`}
    >
      <Icon size={22} style={{ color: theme.accent }} />
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
            className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition ${
              gender === g.id ? "bg-pink text-white shadow-sm" : "text-text-2"
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
      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border-[1.5px] px-4 text-[13px] font-medium transition ${
        active ? "border-pink bg-pink text-white" : "border-border bg-surface text-text-2"
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

function Result({ data }: { data: LookRecommendation }) {
  return (
    <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-300 motion-safe:ease-out">
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
          {data.items.map((it: { category: string; description: string; color: string }, i: number) => {
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
                    <span className="ml-auto shrink-0 pl-2 text-[11px] font-medium text-text-3">
                      {it.color}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-text-2">{it.description}</p>
                </div>
              </div>
            );
          })}
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
