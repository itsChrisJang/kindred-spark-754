import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Sparkles, User, Bookmark, ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PhoneShell({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="phone-frame">
      {children}
      {!hideNav && <BottomNav />}
    </div>
  );
}

function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const item = (to: string, Icon: typeof Home, label: string) => {
    const active = path === to || (to !== "/" && path.startsWith(to));
    return (
      <Link to={to} className="flex flex-1 flex-col items-center gap-1 py-2" aria-label={label}>
        <Icon size={22} className={active ? "text-pink" : "text-text-3"} />
        <span className={`text-[10px] ${active ? "text-pink font-medium" : "text-text-3"}`}>
          {label}
        </span>
      </Link>
    );
  };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto flex min-h-[68px] w-full max-w-[420px] items-stretch justify-around border-t border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)]">
      {item("/", Home, "홈")}
      {item("/places", Search, "장소")}
      <Link
        to="/coach"
        className="flex flex-1 flex-col items-center justify-center gap-1"
        aria-label="AI 소개팅 도우미"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple shadow-[0_6px_16px_rgba(255,75,123,0.35)]">
          <Sparkles size={22} className="text-white" />
        </div>
        <span className="text-[10px] font-medium text-pink">AI 도우미</span>
      </Link>
      {item("/me", Bookmark, "저장")}
      {item("/profile", User, "프로필")}
    </nav>
  );
}

export function NavHeader({
  title,
  back,
  backTo,
  right,
  subtitle,
}: {
  title?: string;
  back?: boolean;
  /** 뒤로가기 목적지. 미지정 시 홈("/"). 2-depth 페이지는 상위 허브 경로를 넘긴다. */
  backTo?: string;
  right?: ReactNode;
  subtitle?: string;
}) {
  return (
    <header className="relative flex flex-shrink-0 items-center bg-surface px-5 pt-4 pb-3">
      <div className="flex w-10 items-center justify-start">
        {back && (
          <Link
            to={backTo ?? "/"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
            aria-label="뒤로"
          >
            <ChevronLeft size={18} />
          </Link>
        )}
      </div>
      <div className={`flex-1 ${back ? "text-center" : ""}`}>
        {subtitle && !back && <div className="text-xs text-text-3">{subtitle}</div>}
        {title && <h1 className="truncate text-[17px] font-semibold text-foreground">{title}</h1>}
      </div>
      <div className="flex w-10 items-center justify-end">{right}</div>
    </header>
  );
}
