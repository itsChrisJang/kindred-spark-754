import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { api, type Gender } from "@/lib/api";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "내 프로필 — 로테이트" },
      { name: "description", content: "닉네임과 취미, 자기소개를 등록하고 모임에 참여해보세요." },
    ],
  }),
  component: Profile,
});

const HOBBIES = ["카페", "사진", "영화", "운동", "게임", "와인", "음악", "여행"];

function Profile() {
  const qc = useQueryClient();
  const { data: existing } = useQuery({ queryKey: ["profile"], queryFn: () => api.getMyProfile() });

  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<Gender>("M");
  const [job, setJob] = useState("");
  const [bio, setBio] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);

  useEffect(() => {
    if (existing) {
      setNickname(existing.nickname);
      setAge(existing.age);
      setGender(existing.gender);
      setJob(existing.job ?? "");
      setBio(existing.bio);
      setHobbies(existing.hobbies);
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: () => api.saveProfile({ nickname, age, gender, job, bio, hobbies, photos: [] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });

  function toggleHobby(h: string) {
    setHobbies((arr) => (arr.includes(h) ? arr.filter((x) => x !== h) : [...arr, h]));
  }

  async function logout() {
    await api.signOut();
    location.href = "/login";
  }

  return (
    <PhoneShell>
      <NavHeader title="내 프로필" right={
        <button onClick={logout} aria-label="로그아웃" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <LogOut size={16} />
        </button>
      } />
      <div className="scroll-area px-4 pt-2">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-mid text-pink">
            <User size={28} />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{nickname || "닉네임을 등록하세요"}</div>
            <div className="mt-0.5 text-xs text-text-3">
              {existing ? "프로필이 저장되어 있어요" : "프로필을 등록하면 모임 참여가 가능해요"}
            </div>
          </div>
          <Link to="/coach/photo" className="rounded-full bg-pink-light px-3 py-1.5 text-xs font-semibold text-pink">
            사진 분석
          </Link>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
          <Row label="닉네임">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
              className="w-full rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-sm outline-none"
              placeholder="닉네임"
            />
          </Row>
          <Row label="나이 · 성별">
            <div className="flex gap-2">
              <input
                type="number"
                min={19}
                max={70}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-24 rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-sm outline-none"
              />
              <div className="flex gap-2">
                {(["M", "F"] as Gender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                      g === gender ? "bg-pink text-white" : "border border-border bg-secondary text-text-2"
                    }`}
                  >
                    {g === "M" ? "남성" : "여성"}
                  </button>
                ))}
              </div>
            </div>
          </Row>
          <Row label="직업">
            <input
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="예: 개발자"
              maxLength={30}
              className="w-full rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-sm outline-none"
            />
          </Row>
          <Row label="자기소개">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="간단한 자기소개를 적어주세요"
              className="w-full resize-none rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-sm outline-none"
            />
          </Row>
          <Row label="관심사">
            <div className="flex flex-wrap gap-2">
              {HOBBIES.map((h) => (
                <button
                  key={h}
                  onClick={() => toggleHobby(h)}
                  className={`pill ${hobbies.includes(h) ? "pill-active" : ""}`}
                >
                  {h}
                </button>
              ))}
            </div>
          </Row>
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={!nickname || save.isPending}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-pink text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {save.isPending ? "저장 중…" : save.isSuccess ? "저장됨 ✓" : "프로필 저장"}
        </button>
        <div className="h-6" />
      </div>
    </PhoneShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs text-text-2">{label}</div>
      {children}
    </div>
  );
}
