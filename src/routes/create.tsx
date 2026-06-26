import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { MapView, AREA_COORDS } from "@/components/MapView";
import { api } from "@/lib/api";


export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "모임 만들기 — 로테이트" },
      { name: "description", content: "원하는 장소와 인원으로 소개팅 모임을 직접 열어보세요." },
    ],
  }),
  component: CreatePage,
});

const CATEGORIES = ["카페", "레스토랑", "게임", "영화", "액티비티", "공연"];
const RATIOS: ("2:2" | "3:3" | "4:4" | "5:5")[] = ["2:2", "3:3", "4:4", "5:5"];

function CreatePage() {
  const nav = useNavigate();
  const [title, setTitle] = useState("성수 감성 카페 소개팅");
  const [category, setCategory] = useState("카페");
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("3:3");
  const [date, setDate] = useState("2026-06-15");
  const [time, setTime] = useState("16:00");
  const [location, setLocation] = useState("성수동 어반소스 카페");

  const create = useMutation({
    mutationFn: () =>
      api.createMeeting({
        title,
        location: location.split(" ")[0],
        venueType: category,
        ratio,
        startsAt: new Date(`${date}T${time}:00+09:00`).toISOString(),
        maleCapacity: Number(ratio[0]),
        femaleCapacity: Number(ratio[2]),
        description: undefined,
      }),
    onSuccess: () => nav({ to: "/" }),
  });

  return (
    <PhoneShell>
      <NavHeader back title="모임 만들기" />

      <div className="scroll-area">
        <div className="px-4 pt-3 pb-4">
          <div className="mb-2 text-xs text-text-3">3단계 중 1단계</div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-1/3 rounded-full bg-pink" />
          </div>
        </div>

        <div className="flex flex-col gap-5 px-4 pb-2">

          <Field label="모임 이름">
            <input
              className="w-full rounded-xl border border-border bg-secondary px-3.5 py-3 text-sm outline-none focus:border-pink"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
            />
          </Field>

          <Field label="카테고리">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`pill ${category === c ? "pill-active" : ""}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          <Field label="인원 구성">
            <div className="grid grid-cols-2 gap-2">
              {RATIOS.map((r) => {
                const active = r === ratio;
                return (
                  <button
                    key={r}
                    onClick={() => setRatio(r)}
                    className={`rounded-xl p-3.5 text-center ${
                      active ? "bg-pink text-white" : "border border-border bg-secondary text-text-2"
                    }`}
                  >
                    <div className="text-xl font-bold">{r}</div>
                    <div className={`mt-0.5 text-[11px] ${active ? "opacity-80" : "text-text-3"}`}>
                      {r[0]}명 × {r[2]}명
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="날짜 & 시간">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-3">
                <Calendar size={16} className="text-pink" />
                <input
                  type="date"
                  className="flex-1 bg-transparent text-sm outline-none"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-3">
                <Clock size={16} className="text-pink" />
                <input
                  type="time"
                  className="flex-1 bg-transparent text-sm outline-none"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          </Field>

          <Field label="장소">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-3">
              <MapPin size={16} className="text-pink" />
              <input
                className="flex-1 bg-transparent text-sm outline-none"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="mt-2">
              <MapView
                lat={(AREA_COORDS[location.split(" ")[0]] ?? AREA_COORDS["성수동"]).lat}
                lng={(AREA_COORDS[location.split(" ")[0]] ?? AREA_COORDS["성수동"]).lng}
                zoom={15}
                height={160}
                label={location}
              />
            </div>

          </Field>

          <div className="flex items-center gap-3 rounded-xl border border-purple/15 bg-purple-light p-3.5">
            <Sparkles size={22} className="flex-shrink-0 text-purple" />
            <div>
              <div className="text-sm font-semibold text-purple">AI가 이 장소를 추천해요</div>
              <div className="mt-0.5 text-xs text-purple/70">
                소개팅 분위기 점수 92점 · 접근성 좋음
              </div>
            </div>
          </div>

          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-pink text-[15px] font-semibold text-white disabled:opacity-50"
          >
            {create.isPending ? "만드는 중…" : "모임 만들기"}
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs text-text-2">{label}</div>
      {children}
    </div>
  );
}
