import { CARDS } from "@/lib/game/cards";
import type { CardInst } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const TYPE_MARK = {
  attack: "攻",
  skill: "守",
  power: "勢",
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
  const ability = def.text(card.upgraded);
  const face = `/cards/faces/${def.id}${card.upgraded ? "-up" : ""}.png?v=4`;
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      data-card-uid={card.uid}
      data-card-motion={motion ?? "idle"}
      data-short-qi={shortQi ? "1" : "0"}
      aria-label={`${def.name}。${ability}`}
      className={cn(
        "talisman relative shrink-0 overflow-hidden text-left",
        `talisman-${def.type}`,
        scale === "sm" && "h-44 w-[7.25rem]",
        scale === "md" && "h-48 w-[7.75rem] sm:h-64 sm:w-[10.25rem]",
        scale === "lg" && "h-72 w-44 sm:h-[28rem] sm:w-[18rem]",
        selected && "-translate-y-3",
        dimmed && "opacity-45",
        onClick && !disabled && motion !== "discard" && "hover:-translate-y-2",
        motion === "draw" && "card-draw-in",
        motion === "discard" && "card-discard-out",
        starved && "card-starve",
      )}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <img src={face} alt="" className="talisman-face-img" crossOrigin="anonymous" />
      <span className="sr-only">
        {def.name}
        {card.upgraded ? "進" : ""}。{ability}
      </span>
      <span
        className={cn(
          "talisman-mark talisman-cost",
          `is-${scale}`,
          shortQi && "is-short",
        )}
      >
        {cost}
      </span>
      <span className={cn("talisman-mark talisman-kind", `is-${scale}`, `is-${def.type}`)}>
        {TYPE_MARK[def.type]}
      </span>
      {shortQi ? <span className="talisman-starve">靈力不足</span> : null}
    </Comp>
  );
}
