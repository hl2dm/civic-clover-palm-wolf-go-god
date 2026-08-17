import { useEffect, useRef, useState } from "react";
import { STATUS_LABEL } from "@/lib/game/engine";
import { intentLabel } from "@/lib/game/enemies";
import type { Floater, Intent, Status } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const LINGER_MS = 1800;

export function useLingerFloaters(items: Floater[]) {
  const seen = useRef(new Set<string>());
  const [shown, setShown] = useState<(Floater & { until: number })[]>([]);
  const ids = items.map((it) => it.id).join("|");
  useEffect(() => {
    if (!items.length && !seen.current.size) return;
    const now = Date.now();
    setShown((prev) => {
      let changed = false;
      const next = prev.filter((p) => {
        if (p.until > now) return true;
        changed = true;
        return false;
      });
      for (const it of items) {
        if (seen.current.has(it.id)) continue;
        seen.current.add(it.id);
        next.push({ ...it, until: now + LINGER_MS });
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [ids, items]);
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now();
      setShown((p) => {
        const next = p.filter((x) => x.until > now);
        return next.length === p.length ? p : next;
      });
    }, 180);
    return () => window.clearInterval(t);
  }, []);
  return shown;
}

export function CombatToast({ line, pulse }: { line: string; pulse?: number }) {
  const [shown, setShown] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (!line) return;
    setShown(line);
    setKey((n) => n + 1);
    const t = window.setTimeout(() => setShown(null), 2000);
    return () => window.clearTimeout(t);
  }, [line, pulse]);
  if (!shown) return null;
  const starve = shown.includes("靈力不足");
  return (
    <div
      key={key}
      data-combat-toast={shown}
      className={cn(
        "fx-toast plaque pointer-events-none absolute left-1/2 top-[34%] z-20 max-w-[16rem] -translate-x-1/2 px-4 py-2 text-center sm:max-w-sm",
        starve && "ring-1 ring-accent",
      )}
    >
      <p className={cn("display-ink text-base leading-snug sm:text-lg", starve ? "text-accent" : "text-paper")}>
        {shown}
      </p>
    </div>
  );
}

export function HpPlaque({
  name,
  hp,
  max,
  block = 0,
  align = "left",
  compact,
}: {
  name: string;
  hp: number;
  max: number;
  block?: number;
  align?: "left" | "right";
  compact?: boolean;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className={cn("min-w-0", compact ? "w-52 sm:w-72" : "w-52 sm:w-80", align === "right" && "text-right")}>
      <p className="display-ink text-base leading-none tracking-wide sm:text-lg">{name}</p>
      <div className={cn("mt-1 flex items-center gap-2", align === "right" && "flex-row-reverse")}>
        {block > 0 ? <BlockSeal value={block} /> : null}
        <div className="min-w-0 flex-1">
          <div className={cn("flex items-end gap-2", align === "right" && "flex-row-reverse")}>
            <span className="qi-num qi-num-hp text-3xl leading-none sm:text-4xl">{hp}</span>
            <span className="qi-num pb-0.5 text-xs text-muted">/{max}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-sm bg-bg/80">
            <div className="h-full bg-hp transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function QiOrbs({ energy, max, starve }: { energy: number; max: number; starve?: number }) {
  return (
    <div
      key={starve ?? 0}
      data-qi-starve={starve ? "1" : "0"}
      className={cn("flex items-center gap-2", starve ? "qi-starve" : "")}
    >
      <span className="display-ink text-sm tracking-[0.3em] text-qi">靈</span>
      <div className="flex gap-1.5">
        {Array.from({ length: Math.max(max, 1) }, (_, i) => (
          <span
            key={i}
            className={cn("orb size-5 rounded-full sm:size-6", i < energy ? "orb-on" : "orb-off")}
          />
        ))}
      </div>
      <span className="qi-num qi-num-qi text-2xl leading-none">{energy}</span>
    </div>
  );
}

export function BlockSeal({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <div className="block-seal" data-block={value} aria-label={`護體 ${value}`}>
      <img src="/ui/block-seal.png?v=3" alt="" className="block-seal-img" crossOrigin="anonymous" />
      <span className="qi-num qi-num-block block-seal-num">{value}</span>
    </div>
  );
}

const INTENT_ICON: Record<string, string> = {
  attack: "/ui/intent-attack.png?v=1",
  attackDebuff: "/ui/intent-attack.png?v=1",
  defend: "/ui/intent-defend.png?v=1",
  buff: "/ui/intent-buff.png?v=1",
  debuff: "/ui/intent-debuff.png?v=1",
};

export function IntentMark({ intent, size = "sm" }: { intent: Intent; size?: "sm" | "lg" }) {
  const icon = INTENT_ICON[intent.kind] ?? INTENT_ICON.attack;
  const showNum = intent.kind === "attack" || intent.kind === "attackDebuff" || intent.kind === "defend";
  const tone =
    intent.kind === "defend" ? "qi-num-block" : intent.kind === "buff" ? "qi-num-heal" : "qi-num-dmg";
  // Intent stamp is independent of sprite boxes. Never inherit parent width.
  const px = size === "lg" ? 36 : 28;
  return (
    <div
      data-intent={intentLabel(intent)}
      className={cn("intent-badge", size === "lg" && "intent-badge-lg")}
      style={{ width: px }}
    >
      <img
        src={icon}
        alt=""
        width={px}
        height={px}
        className="intent-icon"
        style={{ width: px, height: px }}
        crossOrigin="anonymous"
      />
      {showNum ? <span className={cn("intent-num qi-num", tone)}>{intent.value}</span> : null}
    </div>
  );
}

export function StatusStamps({ statuses }: { statuses: Status[] }) {
  if (!statuses.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {statuses.map((s) => (
        <li key={s.id} className="plaque rounded-sm px-2 py-0.5 text-paper">
          <span className="display-ink text-xs">{STATUS_LABEL[s.id]}</span>
          <span className="qi-num ml-1 text-sm">{s.stacks}</span>
        </li>
      ))}
    </ul>
  );
}

export function FxNums({ items }: { items: Floater[] }) {
  const shown = useLingerFloaters(items);
  if (!shown.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
      {shown.map((f, i) => (
        <span
          key={f.id}
          className={cn(
            "fx-floater qi-num text-5xl sm:text-6xl",
            f.kind === "dmg" ? "qi-num-dmg" : f.kind === "heal" ? "qi-num-heal" : "qi-num-block",
          )}
          style={{ marginLeft: i ? 8 : 0 }}
        >
          {f.kind === "dmg" ? `-${f.text}` : f.kind === "heal" ? `+${f.text}` : f.text}
        </span>
      ))}
    </div>
  );
}

export function PreviewMark({ value }: { value: number }) {
  return <span className="qi-num qi-num-dmg text-3xl leading-none sm:text-4xl">-{value}</span>;
}

const TARGET_MARKS = ["壹", "貳", "叁", "肆"];

export function TargetPlate({
  index,
  name,
  damage,
  focused,
}: {
  index: number;
  name: string;
  damage: number | null;
  focused: boolean;
}) {
  return (
    <div
      className={cn("target-plate", focused && "target-plate-focus")}
      data-target-plate={index + 1}
      data-target-focus={focused ? "1" : "0"}
    >
      <span className="display-ink text-xl leading-none tracking-[0.18em] text-paper">
        {TARGET_MARKS[index] ?? String(index + 1)}
      </span>
      <span className="display-ink text-sm leading-tight tracking-wide text-paper">{name}</span>
      {damage != null ? (
        <span className="qi-num qi-num-dmg text-2xl leading-none">-{damage}</span>
      ) : null}
      {focused ? (
        <span className="display-ink text-[11px] tracking-[0.22em] text-accent">斬之</span>
      ) : null}
    </div>
  );
}

export function PileSeal({
  label,
  count,
  pulse,
}: {
  label: string;
  count: number;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "plaque min-w-[3.75rem] rounded-md px-2.5 py-2 text-center sm:min-w-[4.5rem]",
        pulse && "fx-relic",
      )}
    >
      <p className="display-ink text-xs tracking-[0.2em] text-muted">{label}</p>
      <p className="qi-num qi-num-hp mt-0.5 text-3xl leading-none">{count}</p>
    </div>
  );
}
