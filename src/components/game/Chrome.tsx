import { useEffect, useState } from "react";
import { BookOpen, CircleHelp, ScrollText, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isMuted, setMuted, subscribeMute } from "@/lib/game/audio";
import { ACT_NAME } from "@/lib/game/map";
import {
  CALAMITIES,
  FEATS,
  INCENSE,
  REALMS,
  incenseRank,
  realmAt,
  xpToNext,
} from "@/lib/game/meta";
import { featRemain, KIND_LABEL, nextUnlock, remainTo, unlockRows, type UnlockBit } from "@/lib/game/unlocks";
import { CARDS } from "@/lib/game/cards";
import { ENEMIES } from "@/lib/game/enemies";
import { RELICS } from "@/lib/game/relics";
import { POTIONS } from "@/lib/game/potions";
import { useGame } from "@/lib/game/store";
import { cn } from "@/lib/utils";
import { ItemIcon } from "./ItemIcon";
import { TalismanCard } from "./TalismanCard";

const EMPTY_POTIONS: (string | null)[] = [null, null, null];

export function WoodLabel({
  children,
  onClick,
  face = "plaque",
  tone = "gold",
  compact,
  wide,
  disabled,
  className,
}: {
  children: string;
  onClick?: () => void;
  face?: "plaque" | "strip";
  tone?: "gold" | "dark";
  compact?: boolean;
  wide?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const src =
    face === "strip"
      ? "/ui/wood-strip.png"
      : tone === "dark"
        ? "/ui/slip-new-dark-blank.png?v=3"
        : "/ui/slip-new-gold-blank.png?v=3";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "wood-label",
        face === "strip" && "is-strip",
        compact && "is-sm",
        wide && "is-wide",
        tone === "dark" && "is-dark",
        className,
      )}
    >
      <img src={src} alt="" crossOrigin="anonymous" />
      <span>{children}</span>
    </button>
  );
}

export function TopBar() {
  const { run, setDeckOpen, setHelpOpen, setHeritageOpen, abandon, screen } = useGame();
  if (!run || screen === "title") return null;
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-bg/80 px-3 py-2 backdrop-blur-sm sm:px-5">
      <div className="min-w-0">
        <p className="display-ink truncate text-sm">{ACT_NAME[run.act]}</p>
        <p className="display-ink text-[11px] text-muted tabular-nums">
          第 {run.floor} 層 · 氣血 {run.hp}/{run.maxHp} · 靈石 {run.gold}
          {(run.calamity ?? 0) > 0 ? ` · ${CALAMITIES[run.calamity]?.name ?? "劫"}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <MuteButton />
        <Button variant="ghost" size="icon" aria-label="功法" onClick={() => setDeckOpen(true)}>
          <BookOpen className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="規矩" onClick={() => setHelpOpen(true)}>
          <CircleHelp className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="传承" onClick={() => setHeritageOpen(true)}>
          <ScrollText className="size-4" />
        </Button>
        <Button variant="quiet" size="sm" onClick={abandon}>
          棄途
        </Button>
      </div>
    </header>
  );
}

export function MuteButton() {
  const [off, setOff] = useState(isMuted);
  useEffect(() => subscribeMute(setOff), []);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={off ? "開啟音效" : "關閉音效"}
      onClick={() => setMuted(!off)}
    >
      {off ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </Button>
  );
}

export function RelicRow({ compact }: { compact?: boolean }) {
  const relics = useGame((s) => s.run?.relics);
  const pulse = useGame((s) => s.relicPulse);
  const setInspect = useGame((s) => s.setInspect);
  if (!relics?.length) return null;
  return (
    <div className="min-w-0">
      <p className="display-ink mb-1 text-[11px] tracking-[0.32em] text-muted">法寶</p>
      <ul className="flex flex-wrap items-end gap-2">
        {relics.map((id) => {
          const r = RELICS[id];
          if (!r) return null;
          return (
            <li key={id} className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                title={`${r.name}：${r.text}`}
                onClick={() => setInspect({ kind: "relic", id })}
                className={`item-slot grid shrink-0 place-items-center overflow-hidden p-1 ${compact ? "size-14 sm:size-16" : "size-16 sm:size-[4.5rem]"} ${pulse === id ? "fx-relic" : ""}`}
              >
                <ItemIcon kind="relic" id={id} seal={r.seal} className={compact ? "size-12 sm:size-14" : "size-14 sm:size-16"} />
              </button>
              {!compact ? (
                <span className="display-ink max-w-16 truncate text-[10px] tracking-wide text-paper/80 sm:max-w-[4.5rem] sm:text-xs">
                  {r.name}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DeckModal() {
  const { run, deckOpen, setDeckOpen, combat } = useGame();
  if (!deckOpen || !run) return null;
  const cards = combat ? [...combat.drawPile, ...combat.hand, ...combat.discardPile] : run.deck;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-bg/75 p-4">
      <div className="max-h-[86dvh] w-full max-w-3xl overflow-auto rounded-xl bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl">功法匣 · {run.deck.length} 張</h2>
          <Button variant="ghost" size="icon" aria-label="關閉" onClick={() => setDeckOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {(combat ? cards : run.deck).map((c) => (
            <TalismanCard key={c.uid} card={c} compact />
          ))}
        </div>
        {run.relics.length ? (
          <ul className="mt-6 flex flex-wrap gap-3">
            {run.relics.map((id) => {
              const r = RELICS[id];
              return r ? (
                <li key={id} className="flex items-center gap-3 rounded-md bg-elevated px-2 py-2 text-sm">
                  <ItemIcon kind="relic" id={id} seal={r.seal} className="size-12" />
                  <span>
                    <span className="text-fg">{r.name}</span>
                    <span className="text-muted"> · {r.text}</span>
                  </span>
                </li>
              ) : null;
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function HelpModal() {
  const { helpOpen, setHelpOpen } = useGame();
  if (!helpOpen) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-bg/75 p-4">
      <div className="max-h-[86dvh] w-full max-w-lg overflow-auto rounded-xl bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl">問道規矩</h2>
          <Button variant="ghost" size="icon" aria-label="關閉" onClick={() => setHelpOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <ol className="space-y-3 text-sm leading-relaxed text-muted">
          <li>每回合獲得三點靈力，抽五張符籙。點牌打出，需指定目標的劍訣先點牌再點敵人。</li>
          <li>護體只擋傷害，會在你的下回合開始時散去。破防使受傷加重，虛弱使輸出減弱。</li>
          <li>地圖擇一路前行，不可回頭。斬妖得功法，精英與首領掉落法寶，歇息可療傷或溫養。</li>
          <li>法寶點按可查看效果。丹藥在戰鬥中點按服用。兩境：練氣青冥山，築基金丹劫。</li>
          <li>局外有悟道與功德。斬妖積悟，終途結德。功德在传承上香，香火只改下一途。渡劫後可加一層劫難。</li>
        </ol>
      </div>
    </div>
  );
}

export function HeritageModal() {
  const { heritageOpen, setHeritageOpen, meta, buyIncense } = useGame();
  const [tab, setTab] = useState<"realm" | "incense" | "feat" | "codex">("realm");
  const [peek, setPeek] = useState<UnlockBit | null>(null);
  if (!heritageOpen) return null;
  const xp = meta.xp ?? 0;
  const feats = meta.feats ?? [];
  const seen = meta.seen ?? [];
  const seenCards = meta.seenCards ?? [];
  const seenRelics = meta.seenRelics ?? [];
  const cur = realmAt(xp);
  const bar = xpToNext(xp);
  const upcoming = nextUnlock(meta);
  const rows = unlockRows();
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-bg/75 p-3 sm:p-4">
      <div className="heritage-board max-h-[90dvh] w-full max-w-2xl overflow-auto px-4 py-5 sm:px-7 sm:py-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="display-ink text-3xl leading-none text-paper">{cur.name}</p>
            <div className="xp-rail mt-2 w-40">
              <i style={{ width: `${Math.min(100, (bar.have / Math.max(1, bar.need)) * 100)}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="title-hud-chip">
              <b>{xp}</b>悟
            </span>
            <span className="title-hud-chip">
              <b>{meta.merit}</b>德
            </span>
            <Button variant="ghost" size="icon" aria-label="關閉" onClick={() => setHeritageOpen(false)}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="heritage-tabs">
          {(
            [
              ["realm", "悟境"],
              ["incense", "香火"],
              ["feat", "功業"],
              ["codex", "圖錄"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "is-on" : ""}
              onClick={() => {
                setTab(id);
                setPeek(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "realm" ? (
          <ul className="mt-5 space-y-4">
            {rows.map((row) => {
              const open = xp >= row.realm.xp;
              const left = remainTo(meta, row.realm);
              const next = upcoming?.realm.id === row.realm.id;
              return (
                <li key={row.realm.id} className={open ? "unlock-row is-open" : "unlock-row"}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="display-ink text-lg text-paper">{row.realm.name}</p>
                    <span className="shrink-0 text-xs tracking-[0.12em] text-paper/55">
                      {open ? "已開" : next ? `還差 ${left}` : `需 ${row.realm.xp} 悟`}
                    </span>
                  </div>
                  <div className="heritage-thumbs">
                    {row.bits.map((bit) => (
                      <UnlockThumb
                        key={`${bit.kind}-${bit.id}`}
                        bit={bit}
                        locked={!open}
                        onPeek={setPeek}
                      />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {tab === "incense" ? (
          <div className="mt-4">
            <p className="heritage-incense-lead">用功德上香。只改下一途，當途不改。</p>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {INCENSE.map((d) => {
                const rank = incenseRank(meta, d.id);
                const locked = d.need && meta.xp < (REALMS.find((r) => r.id === d.need)?.xp ?? 0);
                const needRealm = REALMS.find((r) => r.id === d.need);
                const left = needRealm ? remainTo(meta, needRealm) : 0;
                const full = rank >= d.max;
                return (
                  <li key={d.id} className={locked ? "heritage-tile is-lock" : "heritage-tile"}>
                    <div className="flex items-start gap-3">
                      <img
                        src={`/items/incense/${d.id}.png?v=1`}
                        alt=""
                        className="heritage-incense-img"
                        crossOrigin="anonymous"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="display-ink text-lg leading-none text-paper">{d.name}</p>
                        <p className="heritage-tile-rank">
                          {rank}/{d.max}
                        </p>
                        <p className="heritage-tile-text">{d.text}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(locked) || full}
                      onClick={() => buyIncense(d.id)}
                      className="heritage-buy mt-3 w-full"
                    >
                      {full ? "滿階" : locked ? `需${needRealm?.name} · 還差 ${left} 悟` : `${d.cost} 功德`}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {tab === "feat" ? (
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FEATS.map((f) => {
              const done = feats.includes(f.id);
              const left = featRemain(meta, f.id);
              return (
                <li key={f.id} className={done ? "heritage-tile is-open" : "heritage-tile is-lock"}>
                  <p className="display-ink text-xl text-paper">{done ? f.name : "？"}</p>
                  <p className="mt-1 text-xs leading-snug text-paper/60">{done ? f.hint : left}</p>
                </li>
              );
            })}
          </ul>
        ) : null}

        {tab === "codex" ? (
          <div className="mt-5 space-y-5">
            <CodexGrid
              label={`敵手 ${seen.length}`}
              bits={Object.values(ENEMIES).map((e) => ({
                id: e.id,
                name: e.name,
                kind: "foe" as const,
                src: e.portrait,
              }))}
              known={seen}
              onPeek={setPeek}
            />
            <CodexGrid
              label={`功法 ${seenCards.length}`}
              bits={Object.values(CARDS).map((c) => ({
                id: c.id,
                name: c.name,
                kind: "card" as const,
                src: `/cards/faces/${c.id}.png?v=4`,
              }))}
              known={seenCards}
              onPeek={setPeek}
            />
            <CodexGrid
              label={`法寶 ${seenRelics.length}`}
              bits={Object.values(RELICS).map((r) => ({
                id: r.id,
                name: r.name,
                kind: "relic" as const,
                src: `/items/relics/${r.id}.png`,
              }))}
              known={seenRelics}
              onPeek={setPeek}
            />
          </div>
        ) : null}

        <p className="heritage-peek">
          {peek
            ? `${KIND_LABEL[peek.kind]} · ${peek.name}${peek.hint ? ` · ${peek.hint}` : ""}`
            : upcoming
              ? `距${upcoming.realm.name}  ${upcoming.remain} 悟`
              : "已至元嬰"}
        </p>
      </div>
    </div>
  );
}

function UnlockThumb({
  bit,
  locked,
  onPeek,
}: {
  bit: UnlockBit;
  locked?: boolean;
  onPeek: (bit: UnlockBit) => void;
}) {
  return (
    <button
      type="button"
      className={locked ? "heritage-thumb is-lock" : "heritage-thumb"}
      title={bit.hint ? `${KIND_LABEL[bit.kind]} · ${bit.name}：${bit.hint}` : `${KIND_LABEL[bit.kind]} · ${bit.name}`}
      onClick={() => onPeek(bit)}
    >
      {bit.src ? (
        <img src={bit.src} alt="" crossOrigin="anonymous" />
      ) : (
        <span>{bit.name.slice(0, 1)}</span>
      )}
    </button>
  );
}

function CodexGrid({
  label,
  bits,
  known,
  onPeek,
}: {
  label: string;
  bits: UnlockBit[];
  known: string[];
  onPeek: (bit: UnlockBit) => void;
}) {
  return (
    <div>
      <p className="display-ink mb-2 text-base text-paper">{label}</p>
      <div className="heritage-thumbs">
        {bits.map((bit) => (
          <UnlockThumb key={bit.id} bit={bit} locked={!known.includes(bit.id)} onPeek={onPeek} />
        ))}
      </div>
    </div>
  );
}

export function ToastBar() {
  const toast = useGame((s) => s.toast);
  const dismissToast = useGame((s) => s.dismissToast);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(dismissToast, 2400);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);
  if (!toast) return null;
  return (
    <button
      type="button"
      onClick={dismissToast}
      className="fx-toast-bar plaque fixed bottom-5 left-1/2 z-30 max-w-[18rem] px-4 py-2 text-center sm:max-w-sm"
    >
      <span className="display-ink text-base text-paper sm:text-lg">{toast}</span>
    </button>
  );
}

export function PotionStrip({ onUse }: { onUse?: (i: number) => void }) {
  const potions = useGame((s) => s.run?.potions);
  const setInspect = useGame((s) => s.setInspect);
  const slots = potions ?? EMPTY_POTIONS;
  return (
    <div className="min-w-0">
      <p className="display-ink mb-1 text-[11px] tracking-[0.32em] text-muted">丹藥</p>
      <div className="flex gap-2">
        {slots.map((id, i) => {
          const p = id ? POTIONS[id] : null;
          return (
            <button
              key={i}
              type="button"
              disabled={!p}
              onClick={() => {
                if (!p) return;
                if (onUse) onUse(i);
                else setInspect({ kind: "potion", id: p.id });
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (p) setInspect({ kind: "potion", id: p.id });
              }}
              title={p ? `${p.name}：${p.text}` : "空丹槽"}
              className="item-slot grid size-16 shrink-0 place-items-center overflow-hidden p-1 transition-transform duration-150 enabled:hover:scale-105 disabled:opacity-35 sm:size-[4.5rem]"
            >
              {p ? (
                <ItemIcon kind="potion" id={p.id} seal={p.seal} className="size-14 sm:size-16" />
              ) : (
                <span className="display-ink text-lg text-muted">空</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ItemInspect() {
  const inspect = useGame((s) => s.inspect);
  const setInspect = useGame((s) => s.setInspect);
  if (!inspect) return null;
  const relic = inspect.kind === "relic" ? RELICS[inspect.id] : null;
  const potion = inspect.kind === "potion" ? POTIONS[inspect.id] : null;
  const name = relic?.name ?? potion?.name ?? "";
  const text = relic?.text ?? potion?.text ?? "";
  const seal = relic?.seal ?? potion?.seal ?? "";
  return (
    <button
      type="button"
      className="fixed inset-0 z-40 grid place-items-center bg-bg/50 p-5"
      onClick={() => setInspect(null)}
    >
      <div className="w-full max-w-sm rounded-xl bg-surface p-5 text-left shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-4">
          {relic ? (
            <ItemIcon kind="relic" id={relic.id} seal={relic.seal} className="size-24 rounded-lg bg-elevated p-1.5 sm:size-28" />
          ) : potion ? (
            <ItemIcon kind="potion" id={potion.id} seal={potion.seal} className="size-24 rounded-lg bg-elevated p-1.5 sm:size-28" />
          ) : (
            <span className="grid size-20 place-items-center rounded-lg bg-elevated font-serif text-2xl">{seal}</span>
          )}
          <div>
            <p className="text-[11px] tracking-[0.2em] text-muted">{inspect.kind === "relic" ? "法寶" : "丹藥"}</p>
            <h3 className="font-serif text-2xl">{name}</h3>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">{text}</p>
      </div>
    </button>
  );
}
