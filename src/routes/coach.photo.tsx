import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Camera, Smile, Sun, Wand2, Bot, RotateCcw, ImagePlus, Shirt, Eye, Users } from "lucide-react";
import { useRef, useState } from "react";
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

function PhotoCoach() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const analyze = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await fileToDataUrl(file);
      return api.analyzePhoto(dataUrl);
    },
  });

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


  const scoreColor = (s: number) => (s >= 85 ? "bg-green-500 text-green-500" : s >= 70 ? "bg-amber-500 text-amber-500" : "bg-pink text-pink");

  return (
    <PhoneShell>
      <NavHeader
        back
        title="AI 사진 코칭"
        right={
          preview && (
            <button onClick={reset} aria-label="다시" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
              <RotateCcw size={14} />
            </button>
          )
        }
      />
      <div className="scroll-area">
        <div className="p-4">
          {preview ? (
            <div className="relative flex aspect-[4/5] w-full items-end overflow-hidden rounded-3xl bg-surface-2 shadow-sm ring-1 ring-border">
              <img src={preview} alt="업로드된 사진" className="absolute inset-0 h-full w-full object-cover" />

              {analyze.isPending && <ScanOverlay />}

              {analyze.data && (
                <div className="z-10 w-full bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4 pt-8">
                  <div className="flex items-end justify-between">
                    <div className="text-left">
                      <div className="text-[11px] uppercase tracking-wider text-white/60">첫인상 점수</div>
                      <div className="text-3xl font-bold leading-tight text-white">{analyze.data.score}<span className="ml-0.5 text-base font-medium text-white/70">점</span></div>
                    </div>
                    <span className={`tag-base ${analyze.data.score >= 80 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {analyze.data.score >= 80 ? "좋은 사진" : "개선 여지"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={openPicker}
              className="group relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl bg-surface ring-1 ring-border transition-all hover:ring-pink/40 hover:shadow-sm"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent 0 11px, var(--color-border) 11px 12px), repeating-linear-gradient(90deg, transparent 0 11px, var(--color-border) 11px 12px)",
                  WebkitMask: "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  padding: 1,
                  opacity: 0,
                }}
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-light text-pink ring-1 ring-pink/15 transition-transform group-hover:scale-105">
                <ImagePlus size={28} strokeWidth={1.75} />
              </div>
              <div className="text-center">
                <div className="text-[15px] font-semibold text-foreground">사진을 업로드해 주세요</div>
                <div className="mt-1 text-xs text-text-3">JPG · PNG · 5MB 이하 권장</div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-4 py-2 text-xs font-semibold text-foreground backdrop-blur ring-1 ring-foreground/10">
                <Camera size={14} strokeWidth={2} />
                사진 선택
              </span>
            </button>
          )}

          {preview && (
            <button
              type="button"
              onClick={openPicker}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-medium text-text-2 ring-1 ring-border transition-colors hover:text-foreground"
            >
              <Camera size={16} />
              다른 사진으로 변경
            </button>
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
          <div className="mx-4 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {(analyze.error as Error).message}
          </div>
        )}

        {!preview && !analyze.isPending && (
          <div className="px-4 pt-4">
            <div className="rounded-2xl border border-purple/15 bg-purple-light p-4 text-sm text-purple">
              자연광이 들어오는 곳에서 상반신이 보이는 사진을 추천해요. AI가 보정 정도와 AI 생성 여부까지 판단합니다.
            </div>
          </div>
        )}

        {analyze.data && <Result data={analyze.data} colorOf={scoreColor} />}
      </div>
    </PhoneShell>
  );
}

function Result({ data, colorOf }: { data: PhotoAnalysis; colorOf: (s: number) => string }) {
  return (
    <>
      <h2 className="px-4 pt-1 pb-3 text-base font-semibold">분석 결과</h2>

      <div className="space-y-2.5 px-4">
        {data.oneLiner && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink/15 via-pink-light to-purple-light p-4 ring-1 ring-pink/20">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-pink">AI 한 줄 평</div>
            <p className="text-[15px] font-semibold leading-snug text-foreground">"{data.oneLiner}"</p>
          </div>
        )}

        <ScoreBar icon={<Smile size={18} />} label="표정 자연스러움" value={data.expression} klass={colorOf(data.expression)} />
        <ScoreBar icon={<Sun size={18} />} label="밝기 & 배경" value={data.brightness} klass={colorOf(data.brightness)} />
        <ScoreBar icon={<Shirt size={18} />} label="스타일 · 옷차림" value={data.styleScore} klass={colorOf(data.styleScore)} />
        <ScoreBar icon={<Eye size={18} />} label="시선 · 구도" value={data.compositionScore} klass={colorOf(data.compositionScore)} />
        <ScoreBar
          icon={<Wand2 size={18} />}
          label="보정 정도"
          value={data.retouchScore}
          klass={colorOf(data.retouchScore)}
          valueText={data.retouchLevel === "natural" ? "자연스러움" : data.retouchLevel === "moderate" ? "보통" : "과함"}
        />

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2 flex items-center gap-2">
            <Shirt size={18} className="text-text-2" />
            <span className="text-sm font-medium">스타일 코멘트</span>
          </div>
          <p className="text-sm leading-relaxed text-text-2">{data.styleComment}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={18} className="text-text-2" />
              <span className="text-sm font-medium">시선 · 구도</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="tag-base bg-secondary text-text-2">시선 {gazeLabel(data.gazeDirection)}</span>
            <span className="tag-base bg-secondary text-text-2">구도 {framingLabel(data.framing)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-text-2" />
              <span className="text-sm font-medium">사진 종류 · 적합도</span>
            </div>
            <span className={`tag-base ${suitabilityClass(data.suitability)}`}>{suitabilityLabel(data.suitability)}</span>
          </div>
          <div className="mb-2">
            <span className="tag-base bg-secondary text-text-2">{photoTypeLabel(data.photoType)}</span>
          </div>
          <p className="text-sm leading-relaxed text-text-2">{data.suitabilityReason}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-text-2" />
              <span className="text-sm font-medium">AI 생성 이미지 여부</span>
            </div>
            <span className={`tag-base ${data.isAiGenerated ? "bg-red-50 text-red-600" : "bg-green-100 text-green-700"}`}>
              {data.isAiGenerated ? "AI 생성 의심" : "실사 사진"}
            </span>
          </div>
        </div>
      </div>

      <h2 className="px-4 pt-5 pb-3 text-base font-semibold">개선 포인트</h2>
      <div className="space-y-2 px-4 pb-6">
        {data.tips.map((t, i) => (
          <div
            key={i}
            className={`rounded-xl p-3 text-sm leading-relaxed ${
              t.type === "good" ? "bg-purple-light text-purple" : "bg-pink-light text-pink"
            }`}
          >
            <div className="mb-1 text-[11px] font-semibold opacity-70">
              {t.type === "good" ? "좋아요" : "개선 포인트"}
            </div>
            <div>{t.text}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function ScoreBar({ icon, label, value, klass, valueText }: { icon: React.ReactNode; label: string; value: number; klass: string; valueText?: string }) {
  const [bg, text] = klass.split(" ");
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className={`flex items-center gap-2 ${text}`}>
          {icon}
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className={`text-sm font-bold ${text}`}>{valueText ?? value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${bg}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function gazeLabel(g: PhotoAnalysis["gazeDirection"]) {
  return g === "camera" ? "정면" : g === "side" ? "측면" : "회피";
}
function framingLabel(f: PhotoAnalysis["framing"]) {
  return f === "closeup" ? "클로즈업" : f === "bust" ? "상반신" : f === "fullbody" ? "전신" : "와이드";
}
function photoTypeLabel(t: PhotoAnalysis["photoType"]) {
  return t === "selfie" ? "셀카" : t === "portrait" ? "인물 사진" : t === "fullbody" ? "전신 컷" : t === "group" ? "단체 사진" : "풍경 위주";
}
function suitabilityLabel(s: PhotoAnalysis["suitability"]) {
  return s === "main" ? "메인 추천" : s === "sub" ? "서브로 적합" : "교체 권장";
}
function suitabilityClass(s: PhotoAnalysis["suitability"]) {
  return s === "main" ? "bg-green-100 text-green-700" : s === "sub" ? "bg-amber-100 text-amber-700" : "bg-red-50 text-red-600";
}

function ScanOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-3xl">
      <div className="absolute inset-0 bg-black/25" />

      {/* diagonal sweeping light */}
      <div
        className="absolute -inset-1/2"
        style={{
          background:
            "linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.18) 49%, rgba(255,182,205,0.55) 50%, rgba(255,255,255,0.18) 51%, transparent 58%)",
          animation: "photo-scan-diag 2.6s linear infinite",
        }}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-white backdrop-blur">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-pink align-middle" />
        분석 중
      </div>

      <style>{`
        @keyframes photo-scan-diag {
          0%   { transform: translate(-30%, -30%); }
          100% { transform: translate(30%, 30%); }
        }
      `}</style>
    </div>
  );
}
