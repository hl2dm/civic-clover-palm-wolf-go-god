import { Crown, Flame, Gem, ScrollText, Skull, Store, Swords } from "lucide-react";
import { ACT_NAME, NODE_LABEL, reachableFrom } from "@/lib/game/map";
import type { MapNode, NodeType } from "@/lib/game/types";
import { useGame } from "@/lib/game/store";
import { cn } from "@/lib/utils";
import { RelicRow } from "./Chrome";

const ICONS: Record<NodeType, typeof Swords> = {
  combat: Swords,
  elite: Skull,
  rest: Flame,
  shop: Store,
  event: ScrollText,
  treasure: Gem,
  boss: Crown,
};

const LAYER_H = 92;
const WIDTHS = [1, 3, 4, 3, 4, 3, 3, 2, 1];

export function MapView() {
  const { run, chooseNode } = useGame();
  if (!run) return null;
  const maxLayer = Math.max(...run.map.map((n) => n.layer));
  const height = (maxLayer + 1) * LAYER_H;
  const reachable = new Set(reachableFrom(run.currentNodeId, run.map, run.visited));
  const byId = new Map(run.map.map((n) => [n.id, n]));

  const point = (node: MapNode) => {
    const w = WIDTHS[node.layer] ?? 3;
    return {
      x: ((node.slot + 0.5) / w) * 100,
      y: (maxLayer - node.layer + 0.5) * LAYER_H,
    };
  };

  return (
    <div className="relative min-h-[calc(100dvh-52px)]">
      <img
        src="/title-bg.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-30"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-bg/75" />
      <div className="relative mx-auto max-w-xl px-3 pb-24 pt-6">
        <div className="mb-4 text-center">
          <p className="text-xs tracking-[0.3em] text-muted">擇路</p>
          <h2 className="mt-1 font-serif text-3xl">{ACT_NAME[run.act]}</h2>
          <p className="mt-2 text-xs text-muted">自下而上，擇一途前行</p>
        </div>
        <div className="mb-4 rounded-lg border border-border bg-surface/80 px-3 py-3">
          <RelicRow />
        </div>
        <div className="relative mx-auto mt-2 w-full max-w-md" style={{ height }}>
          <svg className="pointer-events-none absolute inset-0 size-full text-border-strong" aria-hidden>
            {run.map.flatMap((node) => {
              const a = point(node);
              return node.next.map((nid) => {
                const child = byId.get(nid);
                if (!child) return null;
                const b = point(child);
                return (
                  <line
                    key={`${node.id}-${nid}`}
                    x1={`${a.x}%`}
                    y1={a.y}
                    x2={`${b.x}%`}
                    y2={b.y}
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                );
              });
            })}
          </svg>
          {run.map.map((node) => {
            const Icon = ICONS[node.type];
            const done = run.visited.includes(node.id);
            const here = run.currentNodeId === node.id;
            const open = reachable.has(node.id);
            const p = point(node);
            return (
              <button
                key={node.id}
                type="button"
                disabled={!open}
                onClick={() => chooseNode(node.id)}
                style={{ left: `${p.x}%`, top: p.y }}
                className={cn(
                  "absolute flex size-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border transition-[transform,background-color,border-color] duration-200 sm:size-16",
                  open && "border-paper bg-paper text-paper-ink hover:scale-105",
                  here && "ring-2 ring-accent",
                  done && !here && "border-border bg-elevated text-muted",
                  !open && !done && "border-border bg-surface text-faint",
                )}
              >
                <Icon className="size-4" />
                <span className="mt-0.5 text-[9px] tracking-wide">{NODE_LABEL[node.type]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
