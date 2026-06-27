import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import {
  Camera,
  Smile,
  Sun,
  Wand2,
  ImagePlus,
  Shirt,
  Eye,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { api, type PhotoAnalysis } from "@/lib/api";

export const Route = createFileRoute("/coach/photo")({
  head: () => ({
    meta: [
      { title: "AI 사진 코칭 — 소개팅 AI" },
      { name: "description", content: "프로필 사진의 첫인상·보정·AI 생성 여부를 분석합니다." },
    ],
  }),
  component: PhotoCoach,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("이미지를 읽을 수 없어요"));
    r.readAsDataURL(file);
  });
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// 0 → target 로 부드럽게 세는 카운트업 (reduced-motion이면 즉시 표시)
function useCountUp(target: number, enabled: boolean) {
  const [v, setV] = useState(target);
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setV(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const dur = 750;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled]);
  return v;
}

// ── 점수 임계값·색을 한 곳에서 관리 (메인 배지·점수바·칩 모두 동일 기준) ──
const SCORE_GOOD = 80;
const SCORE_OK = 65;

type Tone = { bar: string; text: string; chip: string };

// pink는 브랜드 전용. 좋음=green / 보통=amber / 경고=rose 로 의미 분리.
function scoreTone(s: number): Tone {
  if (s >= SCORE_GOOD)
    return { bar: "bg-green-500", text: "text-green-600", chip: "bg-green-100 text-green-700" };
  if (s >= SCORE_OK)
    return { bar: "bg-amber-500", text: "text-amber-600", chip: "bg-amber-100 text-amber-700" };
  return { bar: "bg-rose-500", text: "text-rose-600", chip: "bg-rose-100 text-rose-600" };
}

function verdictLabel(s: number) {
  return s >= SCORE_GOOD ? "좋은 사진" : s >= SCORE_OK ? "무난해요" : "개선 필요";
}

function PhotoCoach() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const analyze = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await fileToDataUrl(file);
      return api.analyzePhoto(dataUrl);
    },
  });

  const heroScore = useCountUp(analyze.data?.score ?? 0, !!analyze.data);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    el.value = ""; // 같은 파일 재선택 허용
    el.click();
  }

  async function onFile(f?: File) {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    analyze.mutate(f);
  }

  function reset() {
    setPreview(null);
    analyze.reset();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <PhoneShell>
      <NavHeader back backTo="/coach" title="AI 사진 코칭" />
      <div className="scroll-area">
        <div className="p-4">
          {preview ? (
            // 업로드·분석 중에는 4/5로 크게, 결과가 나오면 3/2로 줄여 분석 카드가 빨리 보이게 함.
            // object-top 으로 어느 비율에서도 상단의 얼굴이 잘리지 않도록 보존.
            <div
              className={`relative flex w-full items-end overflow-hidden rounded-3xl bg-surface-2 shadow-sm ring-1 ring-border transition-[aspect-ratio] duration-300 ${
                analyze.data ? "aspect-[3/2]" : "aspect-[4/5]"
              }`}
            >
              <img
                src={preview}
                alt="업로드된 사진"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />

              {analyze.isPending && <ScanOverlay />}

              {analyze.data && (
                <div className="z-10 w-full bg-gradient-to-t from-black/75 via-black/40 to-transparent p-4 pt-10">
                  <div className="flex items-end justify-between">
                    <div className="text-left">
                      <div className="text-[11px] uppercase tracking-wider text-white/60">
                        첫인상 점수
                      </div>
                      <div className="text-3xl font-bold leading-tight text-white tabular-nums">
                        {heroScore}
                        <span className="ml-0.5 text-base font-medium text-white/70">점</span>
                      </div>
                    </div>
                    <span className={`tag-base ${scoreTone(analyze.data.score).chip}`}>
                      {verdictLabel(analyze.data.score)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={openPicker}
              className="group relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl bg-surface ring-1 ring-border transition-all hover:shadow-sm hover:ring-pink/40 active:scale-[0.99] active:bg-surface-2"
            >
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-light text-pink ring-1 ring-pink/15 transition-transform group-hover:scale-105">
                <ImagePlus size={28} strokeWidth={1.75} />
              </div>
              <div className="text-center">
                <div className="text-[15px] font-semibold text-foreground">탭해서 사진 업로드</div>
                <div className="mt-1 text-xs text-text-2">JPG · PNG · 5MB 이하 권장</div>
              </div>
            </button>
          )}

          {analyze.data?.oneLiner && (
            <div className="result-rise relative mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-pink/15 via-pink-light to-purple-light p-4 ring-1 ring-pink/20">
              <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-pink">
                <Sparkles size={14} /> AI 한 줄 평
              </div>
              <p className="text-[15px] font-semibold leading-snug text-foreground">
                “{analyze.data.oneLiner}”
              </p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        {analyze.isError && (
          <div className="mx-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-600">{(analyze.error as Error).message}</p>
            <button
              type="button"
              onClick={openPicker}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-rose-500 text-sm font-medium text-white"
            >
              <RefreshCw size={15} /> 다시 시도
            </button>
          </div>
        )}

        {!preview && !analyze.isPending && <UploadHints />}

        {analyze.data && <Result data={analyze.data} />}

        {preview && !analyze.isPending && (
          <div className="px-4 pb-6 pt-1">
            <button
              type="button"
              onClick={reset}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-medium text-text-2 ring-1 ring-border transition-colors hover:text-foreground"
            >
              <Camera size={16} />
              다른 사진 분석하기
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes result-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .result-rise { animation: result-rise 0.34s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .bar-fill { transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes chat-pop {
          from { opacity: 0; transform: translateY(7px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chat-pop { animation: chat-pop 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30%           { transform: translateY(-3px); opacity: 1; }
        }
        .typing-dot { animation: typing-bounce 1.15s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .result-rise { animation: none; }
          .bar-fill { transition: none; }
          .chat-pop { animation: none; }
          .typing-dot { animation: none; }
        }
      `}</style>
    </PhoneShell>
  );
}

// ── 공통 섹션 라벨: 결과/빈 상태의 모든 섹션이 동일한 13px 라벨을 쓴다 ──
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 px-0.5 text-[13px] font-semibold text-text-2">{children}</div>;
}

// ── 공통 섹션: 라벨 + 중립 surface 카드. 강조색은 카드 "안"에서만 ──
function Section({
  label,
  delay,
  padded = true,
  children,
}: {
  label: string;
  delay?: number;
  padded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="result-rise" style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      <SectionLabel>{label}</SectionLabel>
      <div
        className={`overflow-hidden rounded-2xl border border-border bg-surface ${padded ? "p-4" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

function UploadHints() {
  const tips = ["자연광 추천", "상반신 위주", "정면 시선", "단독 사진"];
  return (
    <div className="px-4 pt-4">
      <Section label="촬영 팁">
        <p className="text-sm leading-relaxed text-text-2">
          AI가 첫인상·표정·밝기는 물론 보정 정도와 AI 생성 여부까지 한 번에 판단해요.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tips.map((t) => (
            <span key={t} className="tag-base bg-secondary text-text-2">
              {t}
            </span>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Result({ data }: { data: PhotoAnalysis }) {
  // 결과를 동등한 카드 7장이 아니라 hero → 점수 요약 패널 → 메타 배지 → 코멘트의
  // 위계로 묶는다. stagger는 카드 단위가 아닌 "덩어리" 단위로만 줘 과한 연출을 피함.
  const scores = [
    { icon: <Smile size={17} />, label: "표정 자연스러움", value: data.expression },
    { icon: <Sun size={17} />, label: "밝기 & 배경", value: data.brightness },
    { icon: <Shirt size={17} />, label: "스타일 · 옷차림", value: data.styleScore },
    { icon: <Eye size={17} />, label: "시선 · 구도", value: data.compositionScore },
    {
      icon: <Wand2 size={17} />,
      label: "보정 정도",
      value: data.retouchScore,
      valueText:
        data.retouchLevel === "natural"
          ? "자연스러움"
          : data.retouchLevel === "moderate"
            ? "보통"
            : "과함",
    },
  ];

  return (
    <div className="space-y-5 px-4 pb-6">
      {/* 모든 결과 섹션이 동일 골격: [13px 라벨] + [중립 surface 카드]. 색은 카드 안에서만. */}

      {/* 항목별 점수 — 풀폭 미터 패널 */}
      <Section label="항목별 점수" padded={false}>
        <div className="divide-y divide-border">
          {scores.map((s, idx) => (
            <ScoreRow key={s.label} {...s} index={idx} />
          ))}
        </div>
      </Section>

      {/* 코멘트 — AI 코치가 메신저처럼 한 메시지씩 보내는 형태 */}
      <Section label="코멘트" delay={60}>
        <CoachChat
          key={data.styleComment}
          messages={[data.styleComment, data.suitabilityReason].filter(Boolean)}
        />
      </Section>

      {/* 개선 포인트 — 중립 카드 + 색 도트(좋음=green / 개선=amber). 빈 배열이면 섹션 숨김 */}
      {data.tips.length > 0 && (
        <Section label="개선 포인트" delay={120} padded={false}>
          <div className="divide-y divide-border">
            {data.tips.map((t, idx) => {
              const good = t.type === "good";
              return (
                <div key={idx} className="flex gap-2.5 px-4 py-3">
                  <span
                    className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${good ? "bg-green-500" : "bg-amber-500"}`}
                  />
                  <div>
                    <div className="text-[11px] font-semibold text-text-3">
                      {good ? "좋아요" : "개선 포인트"}
                    </div>
                    <div className="mt-0.5 text-sm leading-relaxed text-text-2">{t.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function ScoreRow({
  icon,
  label,
  value,
  valueText,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  valueText?: string;
  index: number;
}) {
  const tone = scoreTone(value);
  // 막대를 0 → value% 로 채우는 등장 전환. 행마다 살짝 지연(stagger).
  const [w, setW] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setW(value);
      return;
    }
    const t = setTimeout(() => setW(value), 150 + index * 90);
    return () => clearTimeout(t);
  }, [value, index]);

  return (
    <div className="px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="text-text-3">{icon}</span>
        <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${tone.text}`}>
          {valueText ?? `${value}점`}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`bar-fill h-full w-full origin-left rounded-full ${tone.bar}`}
          style={{ transform: `scaleX(${w / 100})` }}
        />
      </div>
    </div>
  );
}

// ── AI 코치 채팅: 메시지를 타이핑 인디케이터와 함께 한 개씩 순차 등장 ──
function CoachChat({ messages }: { messages: string[] }) {
  const reduce = prefersReducedMotion();
  const [shown, setShown] = useState(reduce ? messages.length : 0);
  const [typing, setTyping] = useState(!reduce && messages.length > 0);

  useEffect(() => {
    if (reduce) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 250;
    messages.forEach((_, i) => {
      timers.push(setTimeout(() => setTyping(true), t));
      t += 750; // 타이핑 인디케이터 노출 시간
      timers.push(
        setTimeout(() => {
          setShown(i + 1);
          setTyping(false);
        }, t),
      );
      t += 400; // 다음 메시지까지 간격
    });
    return () => timers.forEach(clearTimeout);
    // 메시지 묶음이 바뀌면 key로 리마운트되므로 마운트 시 한 번만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple text-white">
          <Sparkles size={14} />
        </span>
        <span className="text-[13px] font-semibold text-text-2">AI 코치</span>
      </div>
      <div className="space-y-2">
        {messages.slice(0, shown).map((m, i) => (
          <ChatBubble key={i} text={m} />
        ))}
        {typing && <TypingBubble />}
      </div>
    </div>
  );
}

function ChatBubble({ text }: { text: string }) {
  return (
    <div className="chat-pop max-w-[88%] rounded-2xl rounded-tl-md bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
      {text}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="chat-pop flex w-fit items-center gap-1 rounded-2xl rounded-tl-md bg-secondary px-3.5 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-1.5 w-1.5 rounded-full bg-text-3"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function ScanOverlay() {
  // 단계 순환 텍스트로 "무엇을 분석 중인지" 보여줘 대기 체감을 줄임
  const stages = ["표정 분석 중", "밝기·배경 확인 중", "스타일 점검 중", "AI 생성 여부 판별 중"];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((v) => (v + 1) % stages.length), 950);
    return () => clearInterval(t);
  }, [stages.length]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-3xl">
      <div className="absolute inset-0 bg-black/25" />

      {/* diagonal sweeping light */}
      <div
        className="scan-sweep absolute -inset-1/2"
        style={{
          background:
            "linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.18) 49%, rgba(255,182,205,0.55) 50%, rgba(255,255,255,0.18) 51%, transparent 58%)",
          animation: "photo-scan-diag 2.6s linear infinite",
        }}
      />

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center rounded-full bg-black/55 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-white backdrop-blur">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-pink align-middle" />
        {stages[idx]}
      </div>

      <style>{`
        @keyframes photo-scan-diag {
          0%   { transform: translate(-30%, -30%); }
          100% { transform: translate(30%, 30%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .scan-sweep { animation: none !important; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
