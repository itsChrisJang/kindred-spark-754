import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Heart, Sparkles } from "lucide-react";
import { useState } from "react";
import { PhoneShell } from "@/components/PhoneShell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "로그인 — 소개팅 AI" },
      { name: "description", content: "소개팅 AI에 로그인하고 AI 코칭을 시작하세요." },
    ],
  }),
  component: Login,
});

type Mode = "login" | "signup";

function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [nickname, setNickname] = useState("");

  const auth = useMutation({
    mutationFn: () =>
      mode === "login" ? api.login(email, pw) : api.signup(email, pw, nickname),
    onSuccess: () => nav({ to: "/" }),
  });

  const canSubmit =
    !!email && pw.length >= 4 && (mode === "login" || nickname.trim().length >= 2);

  return (
    <PhoneShell hideNav>
      <div className="flex min-h-dvh flex-col justify-between px-6 pt-14 pb-10">
        <div>
          <div className="brand-gradient mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg">
            <Heart size={26} fill="white" className="text-white" />
          </div>
          <h1 className="text-2xl font-bold leading-tight">
            AI가 코칭하는<br />소개팅의 시작
          </h1>
          <p className="mt-2 text-sm text-text-2">
            첫인상 사진부터 대화, 장소까지 — 만남 전부터 자신감 있게.
          </p>

          <div className="mt-7 flex rounded-full bg-secondary p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                mode === "login" ? "bg-surface shadow-sm text-foreground" : "text-text-3"
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                mode === "signup" ? "bg-surface shadow-sm text-foreground" : "text-text-3"
              }`}
            >
              회원가입
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit && !auth.isPending) auth.mutate();
            }}
            className="mt-5 space-y-3"
          >
            {mode === "signup" && (
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임"
                maxLength={12}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3.5 text-sm outline-none focus:border-pink"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3.5 text-sm outline-none focus:border-pink"
            />
            <input
              type="password"
              required
              minLength={4}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="비밀번호 (4자 이상)"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3.5 text-sm outline-none focus:border-pink"
            />
            {auth.isError && (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                {(auth.error as Error).message}
              </div>
            )}
            <button
              type="submit"
              disabled={!canSubmit || auth.isPending}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-pink text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {auth.isPending ? "처리 중…" : mode === "login" ? "로그인" : "가입하고 시작"}
            </button>
          </form>

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-purple/15 bg-purple-light p-3">
            <Sparkles size={14} className="mt-0.5 flex-shrink-0 text-purple" />
            <div className="text-[11px] leading-relaxed text-purple/90">
              데모 모드: 어떤 이메일·비밀번호로도 로그인하면 자동으로 계정이 생성돼요. 데이터는 브라우저에 저장됩니다.
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-text-3">
          계속 진행하면 <span className="text-pink">이용약관</span> · <span className="text-pink">개인정보처리방침</span>에 동의하는 것으로 간주됩니다.
        </div>
      </div>
    </PhoneShell>
  );
}
