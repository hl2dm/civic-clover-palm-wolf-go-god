import { CARDS } from "@/lib/game/cards";
import type { CardInst } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const typeLabel = { attack: "劍訣", skill: "功法", power: "神通" } as const;
const typeTone = {
  attack: "bg-attack text-paper",
  skill: "bg-skill text-paper",
  power: "bg-power text-paper",
} as const;

export function TalismanCard({
  card,
  dimmed,
  selected,
  disabled,
  compact,
  size,
  costOverride,
  motion,
  delayMs,
  shortQi,
  starved,
  onClick,
}: {
  card: CardInst;
  dimmed?: boolean;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  costOverride?: number;
  motion?: "idle" | "draw" | "discard";
  delayMs?: number;
  shortQi?: boolean;
  starved?: boolean;
  onClick?: () => void;
}) {
  const def = CARDS[card.defId];
  if (!def) return null;
  const Comp = onClick ? "button" : "div";
  const cost = costOverride ?? def.cost;
  const scale = size ?? (compact ? "sm" : "md");
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      data-card-uid={card.uid}
      data-card-motion={motion ?? "idle"}
      data-short-qi={shortQi ? "1" : "0"}
      className={cn(
        "talisman-face relative flex shrink-0 flex-col overflow-hidden rounded-lg text-left text-paper-ink shadow-[var(--shadow-border)] transition-[transform,opacity] duration-200 ease-out",
        scale === "sm" && "h-40 w-[6.75rem] p-2",
        scale === "md" && "h-44 w-[7.25rem] p-2 sm:h-60 sm:w-[9.5rem] sm:p-2.5",
        scale === "lg" && "h-56 w-40 p-2.5 sm:h-[22rem] sm:w-52 sm:p-3",
        selected && "-translate-y-3 ring-2 ring-accent",
        dimmed && "opacity-45",
        onClick && !disabled && motion !== "discard" && "hover:-translate-y-2",
        motion === "draw" && "card-draw-in",
        motion === "discard" && "card-discard-out",
        starved && "card-starve",
      )}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "grid place-items-center rounded-full font-semibold tabular-nums",
            scale === "lg" ? "size-9 text-sm" : "size-7 text-xs",
            shortQi ? "bg-accent text-paper" : "bg-paper-ink text-paper",
          )}
        >
          {cost}
        </span>
        <span className={cn("rounded-sm px-1.5 py-0.5 tracking-wide", scale === "lg" ? "text-xs" : "text-[10px]", typeTone[def.type])}>
          {typeLabel[def.type]}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <span
          className={cn(
            "font-serif font-semibold leading-none",
            scale === "lg" ? "text-6xl sm:text-7xl" : "text-4xl sm:text-5xl",
          )}
        >
          {def.seal}
        </span>
      </div>
      <div className={cn("min-h-0 flex-1 space-y-1", scale !== "lg" && "overflow-hidden")}>
        <p className={cn("font-serif font-semibold leading-tight", scale === "lg" ? "text-base sm:text-xl" : "text-sm")}>
          {def.name}
          {card.upgraded ? " · 進" : ""}
        </p>
        {shortQi ? (
          <p className="display-ink text-xs tracking-wide text-accent">靈力不足</p>
        ) : (
          <p className={cn("leading-snug text-paper-ink/75", scale === "lg" ? "text-xs sm:text-sm" : "line-clamp-3 text-[11px]")}>
            {def.text(card.upgraded)}
          </p>
        )}
      </div>
    </Comp>
  );
}
