import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CALAMITIES, PATHS, pathOpen, REALMS, realmAt, xpToNext } from "@/lib/game/meta";
import { nextUnlock, remainTo } from "@/lib/game/unlocks";
import { useGame } from "@/lib/game/store";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { MuteButton, WoodLabel } from "./Chrome";

export function TitleScreen() {
  const {
    run,
    meta,
    newRun,
    continueRun,
    confirmNew,
    setConfirmNew,
    setHelpOpen,
    setHeritageOpen,
    prepareOpen,
    openPrepare,
    closePrepare,
    draftPath,
    draftCalamity,
    setDraftPath,
    setDraftCalamity,
    confirmRun,
  } = useGame();
  const { isPending } = useCurrentUserState();
  const start = () => (meta.runs > 0 ? openPrepare() : newRun());
  const upcoming = nextUnlock(meta);
  const bar = xpToNext(meta.xp ?? 0);
  const hudPct = Math.min(100, (bar.have / Math.max(1, bar.need)) * 100);

  return (
    <section className="title-gate relative min-h-dvh overflow-hidden">
      <img
        src="/title-bg.jpg?v=9"
        alt=""
        className="absolute inset-0 size-full object-cover object-[center_58%]"
        crossOrigin="anonymous"
      />
      <div className="title-shade pointer-events-none absolute inset-0" />

      <div className="title-hud" aria-label="局外數值">
        <p className="title-hud-realm">{realmAt(meta.xp ?? 0).name}</p>
        <div className="score-track is-realm title-hud-bar" style={{ ["--pct" as string]: `${hudPct}%` }}>
          <i />
        </div>
        <div className="title-hud-row">
          <span>
            <b>{meta.xp ?? 0}</b>悟
          </span>
          <span>
            <b>{meta.merit ?? 0}</b>德
          </span>
        </div>
        <p className="title-hud-hint">{upcoming ? `距${upcoming.realm.name} ${upcoming.remain}` : "已至元嬰"}</p>
      </div>

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-end gap-2 px-4 py-4 sm:px-8">
        <MuteButton />
        {isPending ? (
          <div className="size-8 animate-pulse rounded-full bg-elevated" />
        ) : (
          <>
            <SignedOut>
              <Link
                to="/login"
                className="display-ink grid h-10 place-items-center px-2 text-sm tracking-[0.18em] text-paper/70 hover:text-paper"
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

      <div className="title-stage">
        <h1 className="sr-only">問道</h1>
        <div className="title-plaque-wrap">
          <img
            src="/ui/title-wordmark.png?v=16"
            alt="問道"
            className="title-plaque"
            crossOrigin="anonymous"
          />
        </div>

        <div className="title-acts">
          {run ? <WoodLabel onClick={continueRun}>續緣</WoodLabel> : null}
          <WoodLabel
            tone={run ? "dark" : "gold"}
            onClick={() => (run ? setConfirmNew(true) : start())}
          >
            開啟新的一途
          </WoodLabel>
          <button type="button" className="title-seal" aria-label="規矩" onClick={() => setHelpOpen(true)}>
            <img src="/ui/seal-rules.png?v=16" alt="" crossOrigin="anonymous" />
          </button>
          <WoodLabel tone="dark" compact onClick={() => setHeritageOpen(true)}>
            传承
          </WoodLabel>
        </div>
      </div>

      {confirmNew ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-bg/75 px-5">
          <div className="title-confirm">
            <img src="/ui/event-panel.png" alt="" className="title-confirm-wood" crossOrigin="anonymous" />
            <div className="title-confirm-body">
              <h2 className="display-ink text-paper">棄途？</h2>
              <p className="title-confirm-copy">未完之緣將被抹去。</p>
              <div className="title-confirm-acts">
                <WoodLabel tone="gold" compact onClick={() => setConfirmNew(false)}>
                  留下
                </WoodLabel>
                <WoodLabel tone="dark" compact onClick={start}>
                  重新問道
                </WoodLabel>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {prepareOpen ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-bg/70 px-4">
          <div className="heritage-board w-full max-w-md px-5 py-6 sm:px-7">
            <p className="display-ink text-[11px] tracking-[0.38em] text-paper/55">擇緣</p>
            <h2 className="display-ink mt-1 text-3xl text-paper">這一途</h2>
            <p className="mt-4 display-ink text-sm tracking-[0.28em] text-paper/55">道路</p>
            <div className="mt-2 grid gap-2">
              {PATHS.map((p) => {
                const open = pathOpen(meta, p);
                const need = REALMS.find((r) => r.id === p.need);
                const left = need ? remainTo(meta, need) : 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!open}
                    onClick={() => setDraftPath(p.id)}
                    className={cn("prepare-pick", draftPath === p.id && "is-on", !open && "is-lock")}
                  >
                    <b>{p.name}</b>
                    <span>{open ? p.hint : `需${need?.name} · 還差 ${left} 悟`}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-5 display-ink text-sm tracking-[0.28em] text-paper/55">天劫</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CALAMITIES.map((c) => {
                const open = c.rank <= (meta.maxCalamity ?? 0);
                return (
                  <button
                    key={c.rank}
                    type="button"
                    disabled={!open}
                    onClick={() => setDraftCalamity(c.rank)}
                    className={cn("prepare-seal", draftCalamity === c.rank && "is-on", !open && "is-lock")}
                    title={open ? c.hint : "未開"}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-paper/50">{CALAMITIES[draftCalamity]?.hint}</p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <WoodLabel onClick={confirmRun}>開啟新的一途</WoodLabel>
              <button
                type="button"
                className="display-ink text-sm tracking-[0.2em] text-paper/55"
                onClick={closePrepare}
              >
                回頭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
