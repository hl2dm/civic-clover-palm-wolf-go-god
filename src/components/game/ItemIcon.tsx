import { useState } from "react";
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
  const [ok, setOk] = useState(true);
  return (
    <span className={cn("relative grid place-items-center overflow-hidden", className)}>
      {ok ? (
        <img
          src={itemSrc(kind, id)}
          alt=""
          className="size-full object-contain"
          crossOrigin="anonymous"
          onError={() => setOk(false)}
        />
      ) : (
        <span className="display-ink text-lg text-paper/85">{seal}</span>
      )}
      <span className="sr-only">{seal}</span>
    </span>
  );
}