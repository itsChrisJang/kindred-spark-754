import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Plus, Sparkles, User } from "lucide-react";
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
      <Link
        to={to}
        className="flex flex-1 flex-col items-center gap-1 py-2"
        aria-label={label}
      >
        <Icon size={22} className={active ? "text-pink" : "text-text-3"} />
        <span className={`text-[10px] ${active ? "text-pink font-medium" : "text-text-3"}`}>
          {label}
        </span>
      </Link>
    );
  };
  return (
    <nav className="fixed inset-x-0 bottom-0 mx-auto flex h-[72px] w-full max-w-[420px] items-center justify-around border-t border-border bg-surface pb-2">
      {item("/", Home, "홈")}
      {item("/places", Search, "탐색")}
      <Link
        to="/create"
        className="relative flex flex-1 flex-col items-center"
        aria-label="모임 생성"
      >
        <div className="absolute -top-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-pink shadow-[0_4px_16px_rgba(255,75,123,0.4)]">
          <Plus size={24} className="text-white" />
        </div>
        <span className="mt-7 text-[10px] font-medium text-pink">생성</span>
      </Link>
      {item("/coach", Sparkles, "AI 코칭")}
      {item("/profile", User, "프로필")}
    </nav>
  );
}

export function NavHeader({
  title,
  back,
  right,
  subtitle,
}: {
  title?: string;
  back?: boolean;
  right?: ReactNode;
  subtitle?: string;
}) {
  return (
    <header className="flex flex-shrink-0 items-center justify-between bg-surface px-5 pt-4 pb-3">
      {back ? (
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
          aria-label="뒤로"
        >
          ←
        </Link>
      ) : (
        <div>
          {subtitle && <div className="text-xs text-text-3">{subtitle}</div>}
          {title && <h1 className="text-[17px] font-semibold text-foreground">{title}</h1>}
        </div>
      )}
      {back && title && (
        <h1 className="text-[17px] font-semibold text-foreground">{title}</h1>
      )}
      <div className="flex min-w-9 items-center justify-end">{right}</div>
    </header>
  );
}
