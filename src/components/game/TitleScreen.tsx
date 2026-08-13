import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useGame } from "@/lib/game/store";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { MuteButton } from "./Chrome";

export function TitleScreen() {
  const { run, meta, newRun, continueRun, confirmNew, setConfirmNew, setHelpOpen } = useGame();
  const { isPending } = useCurrentUserState();

  return (
    <section className="relative min-h-dvh overflow-hidden">
      <img
        src="/title-bg.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover"
        crossOrigin="anonymous"
      />
      <div className="ink-vignette absolute inset-0" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 sm:px-8">
        <p className="text-xs tracking-[0.28em] text-muted">渡劫 · 卡牌修仙</p>
        <div className="flex items-center gap-2">
          <MuteButton />
          {isPending ? (
            <div className="size-8 animate-pulse rounded-full bg-elevated" />
          ) : (
            <>
              <SignedOut>
                <Link
                  to="/login"
                  className="grid h-10 place-items-center rounded-md border border-border px-3 text-sm text-muted hover:text-fg"
                >
                  登入
                </Link>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </>
          )}
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col justify-end px-5 pb-12 pt-28 sm:pb-16">
        <p className="mb-3 text-sm tracking-[0.4em] text-muted">靈墟</p>
        <h1 className="font-serif text-6xl font-semibold tracking-tight text-fg sm:text-7xl">問道</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          青冥山門再開。以符籙為劍，以護體為盾，一途斬妖，一途渡劫。死則輪迴，功法不帶。
        </p>

        <dl className="mt-8 grid grid-cols-3 gap-3 text-sm">
          <Stat label="問道次數" value={meta.runs} />
          <Stat label="渡劫成功" value={meta.victories} />
          <Stat label="最高層數" value={meta.bestFloor} />
        </dl>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {run ? (
            <Button size="lg" className="flex-1" onClick={continueRun}>
              續緣
            </Button>
          ) : null}
          <Button
            size="lg"
            variant={run ? "ghost" : "primary"}
            className="flex-1"
            onClick={() => (run ? setConfirmNew(true) : newRun())}
          >
            開啟新的一途
          </Button>
          <Button size="lg" variant="quiet" onClick={() => setHelpOpen(true)}>
            規矩
          </Button>
        </div>
      </div>

      {confirmNew ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-bg/70 px-5">
          <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-[var(--shadow-lift)]">
            <h2 className="font-serif text-xl">放棄此途？</h2>
            <p className="mt-2 text-sm text-muted">未完成的問道將被抹去。</p>
            <div className="mt-6 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmNew(false)}>
                留下
              </Button>
              <Button className="flex-1" onClick={newRun}>
                重新問道
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-bg/50 px-3 py-3">
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className="mt-1 font-serif text-2xl tabular-nums">{value}</dd>
    </div>
  );
}
