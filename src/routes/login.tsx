import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Heart, Shield } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { api } from "@/lib/api";

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

  const google = useMutation({
    mutationFn: () => api.loginWithGoogle(),
    onSuccess: () => nav({ to: "/" }),
  });

  return (
    <PhoneShell hideNav>
      <div className="flex min-h-dvh flex-col justify-between px-6 pt-16 pb-10">
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

          <div className="mt-8 flex items-start gap-2 rounded-2xl border border-border bg-secondary p-3.5">
            <Shield size={16} className="mt-0.5 flex-shrink-0 text-purple" />
            <div className="text-[12px] leading-relaxed text-text-2">
              <span className="font-semibold text-foreground">구글 로그인만 사용합니다.</span>{" "}
              비밀번호를 저장하지 않아 안전하고, 별도 회원가입 절차 없이 바로 시작할 수 있어요.
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={() => google.mutate()}
            disabled={google.isPending}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface text-[15px] font-semibold text-foreground shadow-sm disabled:opacity-50"
          >
            <GoogleG />
            {google.isPending ? "로그인 중…" : "Google로 계속하기"}
          </button>
          {google.isError && (
            <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
              {(google.error as Error).message}
            </div>
          )}
          <div className="mt-5 text-center text-[11px] leading-relaxed text-text-3">
            계속 진행하면 <span className="text-pink">이용약관</span> · <span className="text-pink">개인정보처리방침</span>에<br />
            동의하는 것으로 간주됩니다.
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
