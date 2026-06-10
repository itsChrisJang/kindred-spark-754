import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Camera, Smile, Sun, Wand2, Bot } from "lucide-react";
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

function PhotoCoach() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const analyze = useMutation({ mutationFn: (file: File) => api.analyzePhoto(file) });

  function onFile(f?: File) {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    analyze.mutate(f);
  }

  return (
    <PhoneShell>
      <NavHeader back title="AI 사진 코칭" />
      <div className="scroll-area">
        <div className="flex gap-3 p-4">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[3/4] max-h-56 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary"
          >
            <Camera size={32} className="text-text-3" />
            <div className="text-xs text-text-3">사진 업로드</div>
          </button>
          <div className="relative flex aspect-[3/4] max-h-56 flex-1 items-end overflow-hidden rounded-2xl bg-gradient-to-br from-pink-mid to-purple-light">
            {preview ? (
              <img src={preview} alt="업로드된 사진" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/50">
                <Camera size={48} />
              </div>
            )}
            {analyze.data && (
              <div className="z-10 w-full rounded-b-2xl bg-black/55 p-2.5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-white/70">첫인상 점수</div>
                    <div className="text-xl font-bold text-white">{analyze.data.score}점</div>
                  </div>
                  <span className="tag-base bg-green-100 text-green-700">좋은 사진</span>
                </div>
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        {analyze.isPending && (
          <div className="px-4 py-6 text-center text-sm text-text-3">AI가 분석 중이에요…</div>
        )}

        {analyze.data && <Result data={analyze.data} />}
      </div>
    </PhoneShell>
  );
}

function Result({ data }: { data: PhotoAnalysis }) {
  return (
    <>
      <h2 className="px-4 pt-1 pb-3 text-base font-semibold">분석 결과</h2>

      <div className="space-y-2.5 px-4">
        <ScoreBar icon={<Smile size={18} className="text-pink" />} label="표정 자연스러움" value={data.expression} color="bg-pink" valueColor="text-pink" />
        <ScoreBar icon={<Sun size={18} className="text-amber-500" />} label="밝기 & 배경" value={data.brightness} color="bg-amber-500" valueColor="text-amber-500" />
        <ScoreBar
          icon={<Wand2 size={18} className="text-green-500" />}
          label="보정 정도"
          value={data.retouchScore}
          color="bg-green-500"
          valueColor="text-green-500"
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
            className={`flex gap-2.5 rounded-xl p-3 text-sm leading-relaxed ${
              t.type === "good" ? "bg-purple-light text-purple" : "bg-pink-light text-pink"
            }`}
          >
            <span>{t.type === "good" ? "✨" : "💡"}</span>
            <div>{t.text}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function ScoreBar({
  icon, label, value, color, valueColor, valueText,
}: { icon: React.ReactNode; label: string; value: number; color: string; valueColor: string; valueText?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">{icon}<span className="text-sm font-medium">{label}</span></div>
        <span className={`text-sm font-bold ${valueColor}`}>{valueText ?? value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
