import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#FF4B7B" },
      { title: "로테이트 — 소개팅, 더 잘 준비하기" },
      {
        name: "description",
        content: "사진, 대화, 장소까지. 소개팅 전에 차분하게 준비할 수 있도록 도와주는 앱이에요.",
      },
      { property: "og:site_name", content: "로테이트" },
      { property: "og:title", content: "로테이트 — 소개팅, 더 잘 준비하기" },
      {
        property: "og:description",
        content: "사진, 대화, 장소까지. 소개팅 전에 차분하게 준비할 수 있도록 도와주는 앱이에요.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "로테이트 — 소개팅, 더 잘 준비하기" },
      {
        name: "twitter:description",
        content: "사진, 대화, 장소까지. 소개팅 전에 차분하게 준비할 수 있도록 도와주는 앱이에요.",
      },
      { name: "twitter:image", content: "/og-image.png" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Nanum+Brush+Script&family=Dancing+Script:wght@700&family=Anton&display=swap" },
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <Outlet />
      </AuthGate>
    </QueryClientProvider>
  );
}

const PUBLIC_PATHS = ["/login"];

function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(import.meta.env.DEV);
  const [hasSession, setHasSession] = useState(import.meta.env.DEV);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(!!data.session);
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED")
        return;
      setHasSession(!!session);
      if (event === "SIGNED_OUT") {
        router.navigate({ to: "/login" });
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!checked) return;
    const path = router.state.location.pathname;
    if (!hasSession && !PUBLIC_PATHS.includes(path)) {
      router.navigate({ to: "/login" });
    }
  }, [checked, hasSession, router, router.state.location.pathname]);

  return <>{children}</>;
}

