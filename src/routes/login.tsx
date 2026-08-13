import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="relative grid min-h-dvh place-items-center px-5">
      <img
        src="/title-bg.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover opacity-40"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-bg/70" />
      <div className="relative w-full max-w-sm rounded-xl bg-surface p-6">
        <p className="text-xs tracking-[0.3em] text-muted">問道</p>
        <h1 className="mt-2 font-serif text-3xl">登入</h1>
        <p className="mt-2 text-sm text-muted">記下此身來歷。遊玩不必登入。</p>
        <div className="mt-6 space-y-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                variant="ghost"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                以 {p.label} 繼續
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted">登入已關閉。</p>
          )}
        </div>
        <Link to="/" className="mt-5 inline-block text-sm text-muted hover:text-fg">
          返回山門
        </Link>
      </div>
    </main>
  );
}
