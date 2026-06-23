import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Camera, Smile, Sun, Wand2, Bot, RotateCcw } from "lucide-react";
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
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="relative flex aspect-[4/5] w-full items-end overflow-hidden rounded-3xl border-2 border-dashed border-border bg-gradient-to-br from-pink-mid to-purple-light"
          >
            {preview ? (
              <img src={preview} alt="업로드된 사진" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                  <Camera size={28} />
                </div>
                <div className="text-sm font-semibold">사진을 업로드해 주세요</div>
                <div className="text-xs text-white/80">탭하여 갤러리에서 선택</div>
              </div>
            )}
            {analyze.data && (
              <div className="z-10 w-full bg-black/55 p-3 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-[11px] text-white/70">첫인상 점수</div>
                    <div className="text-2xl font-bold text-white">{analyze.data.score}점</div>
                  </div>
                  <span className={`tag-base ${analyze.data.score >= 80 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {analyze.data.score >= 80 ? "좋은 사진" : "개선 여지"}
                  </span>
                </div>
              </div>
            )}
          </button>

          {preview && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-medium text-text-2"
            >
              <Camera size={16} />
              다른 사진 업로드
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

        {analyze.isPending && (
          <div className="px-4 py-6 text-center text-sm text-text-3 animate-pulse">AI가 사진을 분석 중이에요…</div>
        )}
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
        <ScoreBar icon={<Smile size={18} />} label="표정 자연스러움" value={data.expression} klass={colorOf(data.expression)} />
        <ScoreBar icon={<Sun size={18} />} label="밝기 & 배경" value={data.brightness} klass={colorOf(data.brightness)} />
        <ScoreBar
          icon={<Wand2 size={18} />}
          label="보정 정도"
          value={data.retouchScore}
          klass={colorOf(data.retouchScore)}
          valueText={data.retouchLevel === "natural" ? "자연스러움" : data.retouchLevel === "moderate" ? "보통" : "과함"}
        />
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
