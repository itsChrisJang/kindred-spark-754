import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
    return () => { mounted = false; };
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
      <div
        className="flex min-h-dvh flex-col items-center justify-between pb-10"
        style={{ background: "#fff" }}
      >
        <div className="flex flex-1 w-full items-center justify-center">
          <HandwritingAnimation />
        </div>

        <div className="w-full px-6">
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
        </div>
      </div>
    </PhoneShell>
  );
}

/**
 * opentype.js로 Dancing Script 폰트를 SVG path로 변환한 뒤
 * stroke-dashoffset 애니메이션으로 펜이 그려지는 효과
 */
function HandwritingAnimation() {
  const [paths, setPaths] = useState<{ d: string; len: number }[]>([]);
  const [viewBox, setViewBox] = useState("0 0 360 120");
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const rafRef   = useRef<number>(0);

  // opentype.js로 폰트 로드 → path 추출
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [mod, res] = await Promise.all([
        import("opentype.js"),
        fetch(
          "https://fonts.gstatic.com/s/dancingscript/v29/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7B1i03Sup5.ttf"
        ),
      ]);
      if (cancelled || !res.ok) return;

      const buffer = await res.arrayBuffer();
      if (cancelled) return;

      // v2 API: parse(buffer)
      const opentype = mod.default ?? mod;
      const font = (opentype as any).parse(buffer);

      const FONT_SIZE = 100;
      const PAD = 10;
      const fullPath = (font as any).getPath("Rotate", PAD, FONT_SIZE + PAD, FONT_SIZE);
      const bbox = fullPath.getBoundingBox();
      const vw = Math.ceil(bbox.x2 - bbox.x1) + PAD * 2 + 10;
      const vh = Math.ceil(bbox.y2 - bbox.y1) + PAD * 2;

      if (cancelled) return;
      const vb = `${bbox.x1 - PAD} ${bbox.y1 - PAD} ${vw} ${vh}`;
      console.log('[opentype] bbox', bbox, 'viewBox', vb, 'pathLen', fullPath.toPathData(2).length);
      setViewBox(vb);
      setPaths([{ d: fullPath.toPathData(2), len: 0 }]);
    })();

    return () => { cancelled = true; };
  }, []);

  // path가 마운트된 뒤 getTotalLength → dashoffset 애니메이션
  useEffect(() => {
    if (paths.length === 0) return;

    const el = pathRefs.current[0];
    if (!el) return;

    const len = el.getTotalLength();
    console.log('[opentype] getTotalLength =', len, 'el:', el.tagName, 'd slice:', el.getAttribute('d')?.slice(0, 50));
    // SVG attribute 방식으로 설정 (CSS unit 문제 방지)
    el.setAttribute("stroke-dasharray",  String(len));
    el.setAttribute("stroke-dashoffset", String(len));

    const DURATION = 2600;
    let start: number | null = null;
    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const draw = (ts: number) => {
      if (!start) start = ts;
      const t = ease(Math.min((ts - start) / DURATION, 1));
      el.setAttribute("stroke-dashoffset", String(len * (1 - t)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        el.setAttribute("fill", "#111");
        el.setAttribute("stroke", "none");
      }
    };

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(draw);
    }, 350);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [paths]);

  return (
    <svg
      viewBox={viewBox}
      style={{ width: "min(340px, 82vw)", display: "block", overflow: "visible" }}
    >
      {paths.map((p, i) => (
        <path
          key={i}
          ref={(el) => { pathRefs.current[i] = el; }}
          d={p.d}
          fill="transparent"
          stroke="#111"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
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
