import { cn } from "@/lib/utils";

export function itemSrc(kind: "relic" | "potion" | "misc", id: string): string {
  if (kind === "relic") return `/items/relics/${id}.png`;
  if (kind === "potion") return `/items/potions/${id}.png`;
  return `/items/${id}.png`;
}

export function ItemIcon({
  kind,
  id,
  seal,
  className,
}: {
  kind: "relic" | "potion" | "misc";
  id: string;
  seal?: string;
  className?: string;
}) {
  return (
    <span className={cn("relative grid place-items-center overflow-hidden", className)}>
      <img
        src={itemSrc(kind, id)}
        alt=""
        className="size-full object-contain"
        crossOrigin="anonymous"
      />
      <span className="sr-only">{seal}</span>
    </span>
  );
}
