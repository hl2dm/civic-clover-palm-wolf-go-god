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
    <section className="title-screen relative min-h-dvh overflow-hidden">
      <img
        src="/title-bg.jpg"
        alt=""
        className="absolute inset-0 size-full scale-105 object-cover"
        crossOrigin="anonymous"
      />
      <div className="title-mist absolute inset-0" />
      <div className="ink-vignette absolute inset-0" />
      <div className="title-frame pointer-events-none absolute inset-3 sm:inset-5" aria-hidden />

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-8">
        <p className="display-ink text-[11px] tracking-[0.35em] text-paper/70 sm:text-xs">
          渡劫 · 卡牌修仙
        </p>
        <div className="flex items-center gap-2">
          <MuteButton />
          {isPending ? (
            <div className="size-8 animate-pulse rounded-full bg-elevated" />
          ) : (
            <>
              <SignedOut>
                <Link
                  to="/login"
                  className="grid h-10 place-items-center rounded-md border border-border/80 bg-bg/40 px-3 text-sm text-muted backdrop-blur-sm hover:border-border-strong hover:text-fg"
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

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col justify-end px-4 pb-10 pt-24 sm:max-w-xl sm:px-6 sm:pb-14">
        <div className="title-hero mb-6 text-center sm:mb-8">
          <p className="display-ink mb-2 text-[11px] tracking-[0.55em] text-paper/55 sm:text-xs">
            靈墟 · 青冥山門
          </p>
          <div className="title-seal mx-auto inline-block px-6 py-3 sm:px-10 sm:py-4">
            <h1 className="title-word font-serif text-6xl font-semibold tracking-[0.12em] text-paper sm:text-8xl">
              問道
            </h1>
          </div>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted sm:mt-5 sm:text-[15px]">
            以符籙為劍，以護體為盾。一途斬妖，一途渡劫。死則輪迴，功法不帶。
          </p>
        </div>

        <dl className="mb-5 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-3">
          <Stat label="問道" value={meta.runs} />
          <Stat label="渡劫" value={meta.victories} />
          <Stat label="最高層" value={meta.bestFloor} />
        </dl>

        <div className="title-menu flex flex-col gap-2.5">
          {run ? (
            <button type="button" className="title-btn title-btn-main" onClick={continueRun}>
              <span className="title-btn-label">續緣</span>
              <span className="title-btn-sub">接續未竟之途</span>
            </button>
          ) : null}
          <button
            type="button"
            className={run ? "title-btn title-btn-alt" : "title-btn title-btn-main"}
            onClick={() => (run ? setConfirmNew(true) : newRun())}
          >
            <span className="title-btn-label">開啟新的一途</span>
            <span className="title-btn-sub">{run ? "捨棄當前存檔，重新問道" : "從練氣境踏上青冥山"}</span>
          </button>
          <button type="button" className="title-btn title-btn-quiet" onClick={() => setHelpOpen(true)}>
            <span className="title-btn-label">規矩</span>
            <span className="title-btn-sub">符籙、護體與地圖法則</span>
          </button>
        </div>

        <p className="mt-5 text-center text-[10px] tracking-[0.25em] text-faint sm:mt-6">
          ROGUELIKE · TALISMAN CARDS
        </p>
      </div>

      {confirmNew ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-bg/75 px-5 backdrop-blur-[2px]">
          <div className="title-dialog w-full max-w-sm p-6">
            <h2 className="font-serif text-xl tracking-wide">放棄此途？</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">未完成的問道將被抹去，無法復原。</p>
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
    <div className="title-stat">
      <dt className="display-ink text-[10px] tracking-[0.28em] text-faint sm:text-[11px]">{label}</dt>
      <dd className="qi-num mt-1 text-2xl text-paper sm:text-3xl">{value}</dd>
    </div>
  );
}
