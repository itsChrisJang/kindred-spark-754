import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Heart, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneShell } from "@/components/PhoneShell";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "로그인 — 소개팅 AI" },
      { name: "description", content: "구글로 간편하게 시작하세요." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();

  // 이미 로그인된 사용자는 홈으로
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) nav({ to: "/" });
    });
    return () => {
      mounted = false;
    };
  }, [nav]);

  const google = useMutation({
    mutationFn: async () => {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      // result.redirected === true 면 브라우저가 곧 Google로 이동
    },
    onSuccess: () => {
      // 토큰을 받은 경우 (managed flow가 즉시 세션 설정)
      nav({ to: "/" });
    },
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const emailAuth = useMutation({
    mutationFn: async () => {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => nav({ to: "/" }),
  });

  return (
    <PhoneShell hideNav>
      <div className="flex min-h-dvh flex-col justify-between px-6 pt-12 pb-10">
        <div>
          <div className="brand-gradient mb-6 flex h-16 w-16 items-center justify-center rounded-3xl shadow-lg">
            <Heart size={30} fill="white" className="text-white" />
          </div>
          <h1 className="text-[26px] font-bold leading-tight">
            AI가 코칭하도록 하는<br />소개팅의 시작
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-2">
            첫인상 사진부터 대화, 장소까지 — 만남 전부터 자신감 있게.
          </p>

          <div className="mt-6 flex items-start gap-2 rounded-2xl border border-border bg-secondary p-3.5">
            <Shield size={16} className="mt-0.5 flex-shrink-0 text-purple" />
            <div className="text-[12px] leading-relaxed text-text-2">
              <span className="font-semibold text-foreground">
                구글 또는 이메일로 안전하게 로그인하세요.
              </span>{" "}
              비밀번호는 암호화되어 저장되며, 모든 데이터는 본인만 접근 가능합니다.
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email && password.length >= 6 && !emailAuth.isPending)
                emailAuth.mutate();
            }}
            className="mt-6 space-y-2"
          >
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-3.5 py-3 text-sm outline-none focus:border-pink"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-3.5 py-3 text-sm outline-none focus:border-pink"
            />
            <button
              type="submit"
              disabled={emailAuth.isPending}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-pink text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {emailAuth.isPending
                ? "처리 중…"
                : mode === "signup"
                  ? "이메일로 회원가입"
                  : "이메일로 로그인"}
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="w-full pt-1 text-center text-xs text-text-3"
            >
              {mode === "signup"
                ? "이미 계정이 있어요 — 로그인"
                : "처음이세요? — 회원가입"}
            </button>
            {emailAuth.isError && (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                {(emailAuth.error as Error).message}
              </div>
            )}
          </form>
        </div>

        <div className="pt-6">
          <div className="mb-3 flex items-center gap-2 text-[11px] text-text-3">
            <div className="h-px flex-1 bg-border" />
            또는
            <div className="h-px flex-1 bg-border" />
          </div>
          <button
            onClick={() => google.mutate()}
            disabled={google.isPending}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface text-[15px] font-semibold text-foreground shadow-sm disabled:opacity-50"
          >
            <GoogleG />
            {google.isPending ? "Google로 이동 중…" : "Google로 계속하기"}
          </button>
          {google.isError && (
            <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
              {(google.error as Error).message}
            </div>
          )}
          <div className="mt-4 text-center text-[11px] leading-relaxed text-text-3">
            계속 진행하면 <span className="text-pink">이용약관</span> ·{" "}
            <span className="text-pink">개인정보처리방침</span>에 동의하는 것으로
            간주됩니다.
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.3l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8L6.2 33C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.5l6.2 5.2C41.8 35.8 44 30.4 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
