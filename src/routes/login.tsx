import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Bookmark, Camera, MessageCircle, Search, Sparkles, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { PhoneShell } from "@/components/PhoneShell";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "로그인 — 로테이트" },
      { name: "description", content: "구글 계정으로 간편하게 시작해보세요." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();

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
    },
    onSuccess: () => nav({ to: "/" }),
  });

  return (
    <PhoneShell hideNav>
      <div className="flex min-h-dvh flex-col justify-between overflow-hidden bg-[#fff8f6] px-6 pt-10 pb-9">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink text-white shadow-sm">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="text-[17px] font-black leading-none text-foreground">로테이트</div>
                <div className="mt-1 text-[11px] font-semibold text-pink">ROTATE MATCHING</div>
              </div>
            </div>
          </div>

          <div className="pt-12">
            <h1 className="text-[34px] font-black leading-[1.08] tracking-normal text-foreground">
              흩어진 소개팅
              <br />
              매칭을 한곳에서
            </h1>
            <p className="mt-4 max-w-[280px] text-sm leading-relaxed text-text-2">
              여러 사이트의 모집 중인 매칭을 비교하고, 마음에 드는 매칭은 저장해두세요.
            </p>
          </div>

          <section className="mt-8 rounded-[24px] bg-white/80 p-3 shadow-[0_14px_38px_rgba(30,20,20,0.08)]">
            <div className="grid grid-cols-2 gap-2">
              <FeatureItem
                icon={Search}
                title="매칭 모아보기"
                desc="여러 출처를 한곳에서"
                tone="pink"
              />
              <FeatureItem
                icon={Bookmark}
                title="매칭 저장"
                desc="마음에 드는 자리 보관"
                tone="rose"
              />
              <FeatureItem
                icon={Camera}
                title="AI 사진 코칭"
                desc="첫인상과 보정 정도 분석"
                tone="blue"
              />
              <FeatureItem
                icon={MessageCircle}
                title="AI 준비 도우미"
                desc="대화와 장소 추천까지"
                tone="purple"
              />
            </div>
          </section>
        </div>

        <div className="pt-8">
          <button
            onClick={() => google.mutate()}
            disabled={google.isPending}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-foreground text-[15px] font-bold text-white shadow-sm disabled:opacity-50"
          >
            <GoogleG />
            {google.isPending ? "Google로 이동 중..." : "Google로 계속하기"}
          </button>
          {google.isError && (
            <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
              {(google.error as Error).message}
            </div>
          )}
          <div className="mt-4 text-center text-[11px] leading-relaxed text-text-3">
            계속 진행하면 <span className="text-pink">이용약관</span> ·{" "}
            <span className="text-pink">개인정보처리방침</span>에 동의하는 것으로 간주됩니다.
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

const FEATURE_TONES: Record<
  "pink" | "blue" | "rose" | "purple",
  { icon: string; bg: string; text: string }
> = {
  pink: { icon: "text-pink", bg: "bg-pink-light", text: "text-foreground" },
  blue: { icon: "text-blue-600", bg: "bg-blue-50", text: "text-foreground" },
  rose: { icon: "text-rose-500", bg: "bg-rose-50", text: "text-foreground" },
  purple: { icon: "text-purple", bg: "bg-purple/10", text: "text-foreground" },
};

function FeatureItem({
  icon: Icon,
  title,
  desc,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  tone: keyof typeof FEATURE_TONES;
}) {
  const color = FEATURE_TONES[tone];

  return (
    <div className="rounded-2xl border border-border/70 bg-white px-3 py-3">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${color.bg}`}>
        <Icon size={16} className={color.icon} />
      </div>
      <div className={`text-[13px] font-black leading-tight ${color.text}`}>{title}</div>
      <div className="mt-1 text-[11px] font-medium leading-snug text-text-3">{desc}</div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="rounded-full bg-white"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.3l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8L6.2 33C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.5l6.2 5.2C41.8 35.8 44 30.4 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
