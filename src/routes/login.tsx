import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Heart } from "lucide-react";
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

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const login = useMutation({
    mutationFn: () => api.login(email, pw),
    onSuccess: () => nav({ to: "/" }),
  });

  return (
    <PhoneShell hideNav>
      <div className="flex flex-1 flex-col justify-between px-6 pt-16 pb-10">
        <div>
          <div className="brand-gradient mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
            <Heart size={26} fill="white" />
          </div>
          <h1 className="text-2xl font-bold leading-tight">
            AI가 코칭하는<br />소개팅의 시작
          </h1>
          <p className="mt-2 text-sm text-text-2">
            첫인상 사진부터 대화, 장소까지 — 만남 전부터 자신감 있게.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email && pw) login.mutate();
            }}
            className="mt-10 space-y-3"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3.5 text-sm outline-none focus:border-pink"
            />
            <input
              type="password"
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="비밀번호"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3.5 text-sm outline-none focus:border-pink"
            />
            <button
              type="submit"
              disabled={login.isPending}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-pink text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {login.isPending ? "로그인 중…" : "로그인"}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-text-3">
          계정이 없으신가요?{" "}
          <button
            onClick={() => login.mutate()}
            className="font-semibold text-pink"
          >
            지금 시작하기
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
