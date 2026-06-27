import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Check, X, BadgeCheck, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";

import { api, type Gender, type UserProfile } from "@/lib/api";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "내 프로필 — 포테이토" },
      { name: "description", content: "기본 정보와 매칭 조건을 등록해 맞춤 모임을 추천받아 보세요." },
    ],
  }),
  component: Profile,
});

const AREAS = ["강남", "판교", "홍대", "성수", "잠실", "여의도"];
const RESIDENCE_OPTIONS = [
  "서울 강남구", "서울 서초구", "서울 송파구", "서울 마포구",
  "서울 용산구", "서울 성동구", "서울 영등포구", "경기 성남시",
];
const SMOKE_OPTIONS = ["비흡연", "가끔", "흡연"];
const DRINK_OPTIONS = ["안 마심", "가끔", "자주"];
const HEIGHT_PREF = ["상관없음", "170cm 이상", "175cm 이상", "180cm 이상"];
const INDUSTRIES = [
  "IT · 개발", "금융", "의료", "교육",
  "디자인 · 예술", "마케팅 · 기획", "영업 · 서비스",
  "제조 · 엔지니어링", "공공 · 공무원", "전문직",
];


function Profile() {
  const qc = useQueryClient();
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    api.currentUser().then((u) => {
      if (!u) location.href = "/login";
      else setAuthed(true);
    });
  }, []);
  const { data: existing } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.getMyProfile(),
    enabled: authed === true,
  });

  // 기본 정보
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<Gender>("M");
  const [job, setJob] = useState("");
  const [industry, setIndustry] = useState<string>("IT · 개발");
  const [jobModalOpen, setJobModalOpen] = useState(false);


  // 매칭 조건
  const [ageRange, setAgeRange] = useState<[number, number]>([23, 30]);
  const [useWindow, setUseWindow] = useState(false);
  const [windowN, setWindowN] = useState(5);
  const [areas, setAreas] = useState<string[]>([]);
  const [residence, setResidence] = useState("");
  const [heightSelf, setHeightSelf] = useState<string>("");
  const [heightPref, setHeightPref] = useState("상관없음");
  const [smoking, setSmoking] = useState("비흡연");
  const [drinking, setDrinking] = useState("가끔");
  const [excludeCompany, setExcludeCompany] = useState(true);
  const [rematch, setRematch] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setNickname(existing.nickname);
    setAge(existing.age);
    setGender(existing.gender);
    setJob(existing.job ?? "");
    setAgeRange([existing.preferredAgeMin, existing.preferredAgeMax]);
    setUseWindow(existing.useAgeWindow);
    setWindowN(existing.ageWindowN);
    setAreas(existing.activeAreas);
    setResidence(existing.residence ?? "");
    setHeightSelf(existing.heightSelf ? String(existing.heightSelf) : "");
    setHeightPref(existing.heightPref ?? "상관없음");
    setSmoking(existing.smoking ?? "비흡연");
    setDrinking(existing.drinking ?? "가끔");
    setExcludeCompany(existing.excludeSameCompany);
    setRematch(existing.rematchPrevious);
  }, [existing]);

  // 내 나이 기준 ±N 적용
  const effectiveRange = useMemo<[number, number]>(() => {
    if (useWindow) return [Math.max(19, age - windowN), Math.min(70, age + windowN)];
    return ageRange;
  }, [useWindow, windowN, age, ageRange]);

  const save = useMutation({
    mutationFn: () => {
      const payload: Omit<UserProfile, "id" | "email"> = {
        nickname, age, gender, job, bio: existing?.bio ?? "",
        hobbies: existing?.hobbies ?? [], photos: existing?.photos ?? [],
        preferredAgeMin: effectiveRange[0],
        preferredAgeMax: effectiveRange[1],
        useAgeWindow: useWindow,
        ageWindowN: windowN,
        activeAreas: areas,
        residence: residence || undefined,
        heightSelf: heightSelf ? Number(heightSelf) : undefined,
        heightPref,
        smoking,
        drinking,
        excludeSameCompany: excludeCompany,
        rematchPrevious: rematch,
      };
      return api.saveProfile(payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });

  function toggleArea(a: string) {
    setAreas((arr) => (arr.includes(a) ? arr.filter((x) => x !== a) : [...arr, a]));
  }
  async function logout() {
    await api.signOut();
    location.href = "/login";
  }

  return (
    <PhoneShell>
      <NavHeader
        title="내 프로필"
        right={
          <button
            onClick={logout}
            aria-label="로그아웃"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
          >
            <LogOut size={16} />
          </button>
        }
      />
      <div className="scroll-area bg-pink-light/40 px-4 pt-3 pb-28">
        {/* 기본 정보 */}
        <Card>
          <SectionLabel>기본 정보</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="닉네임">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                placeholder="닉네임"
                className="input"
              />
            </Field>
            <Field label="직업">
              <button
                type="button"
                onClick={() => setJobModalOpen(true)}
                className="input flex items-center justify-between text-left"
              >
                <span className={job ? "text-text-1" : "text-text-3"}>
                  {job || "직업을 선택해주세요"}
                </span>
                <Pencil size={14} className="text-text-3" />
              </button>
            </Field>

            <Field label="나이">
              <input
                type="number"
                min={19}
                max={70}
                value={age}
                onChange={(e) => setAge(Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="성별">
              <div className="flex gap-2">
                {(["M", "F"] as Gender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      g === gender
                        ? "bg-pink text-white"
                        : "border border-border bg-secondary text-text-2"
                    }`}
                  >
                    {g === "M" ? "남성" : "여성"}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          {nickname && (
            <div className="mt-3 text-xs text-text-3">
              {nickname} · {age}세 {gender === "M" ? "남성" : "여성"}
              {job ? ` · ${job}` : ""}
            </div>
          )}
        </Card>

        {/* 매칭 조건 */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-pink/15 text-pink">
              <Check size={14} strokeWidth={3} />
            </span>
            <h2 className="text-[15px] font-bold text-pink">매칭 조건</h2>
          </div>

          {/* 선호 나이대 */}
          <Field label="선호 나이대">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-3">최소 ~ 최대</span>
              <span className="font-semibold text-pink">
                {effectiveRange[0]} ~ {effectiveRange[1]}세
              </span>
            </div>
            <RangeSlider
              min={19}
              max={50}
              value={ageRange}
              disabled={useWindow}
              onChange={setAgeRange}
            />
            <button
              onClick={() => setUseWindow((v) => !v)}
              className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                useWindow ? "bg-pink text-white" : "bg-pink-light text-pink"
              }`}
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] ${
                  useWindow ? "bg-white text-pink" : "border border-pink/40"
                }`}
              >
                {useWindow && <Check size={10} strokeWidth={3} />}
              </span>
              내 나이 기준 ±
              <input
                type="number"
                min={1}
                max={20}
                value={windowN}
                onChange={(e) => setWindowN(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                onClick={(e) => e.stopPropagation()}
                className="w-8 rounded bg-white/60 px-1 text-center text-xs text-pink outline-none"
              />
            </button>
          </Field>

          {/* 활동 가능 지역 */}
          <Field
            label="활동 가능 지역"
            hint="필수 · 복수 선택"
          >
            <div className="flex flex-wrap gap-2">
              {AREAS.map((a) => {
                const on = areas.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => toggleArea(a)}
                    className={`rounded-full px-4 py-1.5 text-sm transition ${
                      on
                        ? "bg-pink text-white"
                        : "border border-border bg-white text-text-2"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* 거주지 */}
          <Field label="거주지" hint="데이트 장소 동선 추천에 사용돼요">
            <select
              value={residence}
              onChange={(e) => setResidence(e.target.value)}
              className="input"
            >
              <option value="">선택 안 함</option>
              {RESIDENCE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>

          {/* 키 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="본인 키">
              <div className="relative">
                <input
                  type="number"
                  min={120}
                  max={230}
                  value={heightSelf}
                  onChange={(e) => setHeightSelf(e.target.value)}
                  placeholder={gender === "F" ? "161" : "174"}
                  className="input pr-9"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-3">cm</span>
              </div>
            </Field>
            <Field label="선호 키">
              <select
                value={heightPref}
                onChange={(e) => setHeightPref(e.target.value)}
                className="input"
              >
                {HEIGHT_PREF.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* 흡연 / 음주 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="흡연">
              <select
                value={smoking}
                onChange={(e) => setSmoking(e.target.value)}
                className="input"
              >
                {SMOKE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="음주">
              <select
                value={drinking}
                onChange={(e) => setDrinking(e.target.value)}
                className="input"
              >
                {DRINK_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* 로테이션 옵션 */}
          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-pink/15 text-pink">
                <Check size={14} strokeWidth={3} />
              </span>
              <h3 className="text-[14px] font-semibold text-pink">로테이션 옵션</h3>
            </div>
            <Toggle
              label="같은 회사 사람 제외"
              checked={excludeCompany}
              onChange={setExcludeCompany}
            />
            <Toggle
              label="이전에 만난 사람 재매칭"
              checked={rematch}
              onChange={setRematch}
            />
          </div>
        </Card>

        <div className="mt-2 text-center text-xs text-text-3">
          <Link to="/coach/photo" className="text-pink underline">
            프로필 사진 분석하러 가기 →
          </Link>
        </div>
      </div>

      {/* Fixed 저장 버튼 */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-border bg-white/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => save.mutate()}
          disabled={!nickname || areas.length === 0 || save.isPending}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-pink text-[15px] font-semibold text-white disabled:opacity-40"
        >
          {save.isPending ? "저장 중…" : save.isSuccess ? "저장됨 ✓" : "프로필 저장"}
        </button>
      </div>

      {jobModalOpen && (
        <JobModal
          industry={industry}
          job={job}
          onClose={() => setJobModalOpen(false)}
          onSave={(nextIndustry, nextJob) => {
            setIndustry(nextIndustry);
            setJob(nextJob);
            setJobModalOpen(false);
          }}
        />
      )}
    </PhoneShell>
  );
}

function JobModal({
  industry,
  job,
  onClose,
  onSave,
}: {
  industry: string;
  job: string;
  onClose: () => void;
  onSave: (industry: string, job: string) => void;
}) {
  const [localIndustry, setLocalIndustry] = useState(industry);
  const [localJob, setLocalJob] = useState(job);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 mx-auto w-full max-w-[380px] animate-in slide-in-from-bottom rounded-t-3xl bg-pink-light p-5 pb-6 shadow-xl sm:rounded-3xl">
        <div className="flex items-center justify-between pb-4">
          <h3 className="text-[18px] font-bold text-foreground">직업</h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-3 hover:bg-white/60"
          >
            <X size={16} />
          </button>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          {/* 업종 */}
          <div>
            <div className="mb-2 text-[12px] text-text-3">업종</div>

            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => {
                const on = i === localIndustry;
                return (
                  <button
                    key={i}
                    onClick={() => setLocalIndustry(i)}
                    className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
                      on
                        ? "bg-pink text-white"
                        : "border border-border bg-white text-text-2"
                    }`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 세부 직무 */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] text-text-3">세부 직무</span>
              <span className="text-[11px] text-text-3">선택 입력</span>
            </div>
            <div className="relative">
              <input
                value={localJob}
                onChange={(e) => setLocalJob(e.target.value)}
                maxLength={30}
                placeholder="예: 프론트엔드 개발자"
                className="w-full rounded-xl bg-secondary px-3.5 py-3 pr-10 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-pink/40"
              />
              <Pencil size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-3" />
            </div>
          </div>
        </div>

        <button
          onClick={() => onSave(localIndustry, localJob.trim())}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-pink text-[15px] font-semibold text-white"
        >
          확인
        </button>
      </div>
    </div>
  );
}


function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
      {children}
    </div>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 text-xs font-medium text-text-3">{children}</div>;
}
function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-text-2">{label}</label>
        {hint && <span className="text-[11px] text-text-3">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
function Toggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-text-1">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-pink" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function RangeSlider({
  min, max, value, onChange, disabled,
}: {
  min: number; max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  disabled?: boolean;
}) {
  const [lo, hi] = value;
  const pctLo = ((lo - min) / (max - min)) * 100;
  const pctHi = ((hi - min) / (max - min)) * 100;
  return (
    <div className={`relative mt-3 h-6 ${disabled ? "opacity-40" : ""}`}>
      <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-pink-light" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-pink"
        style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={lo}
        disabled={disabled}
        onChange={(e) => {
          const v = Math.min(Number(e.target.value), hi - 1);
          onChange([v, hi]);
        }}
        className="range-thumb absolute inset-0 w-full appearance-none bg-transparent"
      />
      <input
        type="range"
        min={min}
        max={max}
        value={hi}
        disabled={disabled}
        onChange={(e) => {
          const v = Math.max(Number(e.target.value), lo + 1);
          onChange([lo, v]);
        }}
        className="range-thumb absolute inset-0 w-full appearance-none bg-transparent"
      />
    </div>
  );
}
