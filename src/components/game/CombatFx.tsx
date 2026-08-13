import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CARDS } from "@/lib/game/cards";
import { sfx } from "@/lib/game/audio";
import { useGame } from "@/lib/game/store";
import { cn } from "@/lib/utils";

type Mote = { id: number; x: number; y: number; dx: number; dy: number };

export function useCombatShake() {
  const trauma = useRef(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const tick = () => {
      trauma.current = Math.max(0, trauma.current - 0.05);
      const s = trauma.current * trauma.current;
      setOffset({
        x: s > 0.002 ? (Math.random() * 2 - 1) * s * 16 : 0,
        y: s > 0.002 ? (Math.random() * 2 - 1) * s * 11 : 0,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return {
    offset,
    addTrauma: (n: number) => {
      trauma.current = Math.min(1, trauma.current + n);
    },
  };
}

export function CombatFx({
  addTrauma,
}: {
  addTrauma: (n: number) => void;
}) {
  const combat = useGame((s) => s.combat);
  const lastPlayed = useGame((s) => s.lastPlayed);
  const [now, setNow] = useState(Date.now());
  const [motes, setMotes] = useState<Mote[]>([]);
  const prev = useRef<{ hp: number; block: number; foes: Record<string, number>; played: number }>({
    hp: 0,
    block: 0,
    foes: {},
    played: 0,
  });

  useEffect(() => {
    if (!lastPlayed) return;
    setNow(Date.now());
    const t = window.setTimeout(() => setNow(Date.now()), 1400);
    return () => window.clearTimeout(t);
  }, [lastPlayed]);

  useEffect(() => {
    if (!combat) return;
    if (prev.current.played && combat.playerBlock > prev.current.block) {
      sfx.block();
    }
    if (prev.current.played && combat.playerHp < prev.current.hp) {
      addTrauma(0.5);
      sfx.hurt();
      spawn(0.5, 0.78, "player");
    }
    for (const e of combat.enemies) {
      const was = prev.current.foes[e.uid];
      if (was != null && e.hp < was) {
        addTrauma(e.hp <= 0 ? 0.7 : 0.32);
        sfx.hit();
        spawn(0.5 + Math.random() * 0.2, 0.28, e.uid);
      }
    }
    if (combat.cardsPlayed > prev.current.played) addTrauma(0.18);
    prev.current = {
      hp: combat.playerHp,
      block: combat.playerBlock,
      foes: Object.fromEntries(combat.enemies.map((e) => [e.uid, e.hp])),
      played: combat.cardsPlayed,
    };
  }, [combat, addTrauma]);

  function spawn(x: number, y: number, _key: string) {
    const born = Date.now();
    const batch: Mote[] = Array.from({ length: 7 }, (_, i) => ({
      id: born + i,
      x: x * 100 + (Math.random() * 10 - 5),
      y: y * 100 + (Math.random() * 8 - 4),
      dx: (Math.random() * 2 - 1) * 36,
      dy: -18 - Math.random() * 28,
    }));
    setMotes((m) => [...m.slice(-16), ...batch]);
    window.setTimeout(() => {
      setMotes((m) => m.filter((it) => it.id < born || it.id > born + 10));
    }, 560);
  }

  const slam = lastPlayed && now - lastPlayed.at < 1400 ? lastPlayed : null;
  const def = slam ? CARDS[slam.defId] : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {motes.map((m) => (
        <span
          key={m.id}
          className="fx-mote absolute size-1.5 rounded-full bg-paper/80"
          style={
            {
              left: `${m.x}%`,
              top: `${m.y}%`,
              "--dx": `${m.dx}px`,
              "--dy": `${m.dy}px`,
            } as CSSProperties
          }
        />
      ))}
      {def ? (
        <div className="fx-slam plaque absolute left-1/2 top-[36%] w-28 px-3 py-3 text-center">
          <p className="display-ink text-4xl text-paper">{def.seal}</p>
          <p className="display-ink mt-1 text-sm text-paper">{def.name}</p>
        </div>
      ) : null}
    </div>
  );
}

export function HitWrap({
  targetId,
  children,
  className,
}: {
  targetId: string;
  children: ReactNode;
  className?: string;
}) {
  const combat = useGame((s) => s.combat);
  const hp =
    targetId === "player"
      ? (combat?.playerHp ?? 0)
      : (combat?.enemies.find((e) => e.uid === targetId)?.hp ?? 0);
  const prev = useRef(hp);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (hp < prev.current) {
      setFlash(true);
      const t = window.setTimeout(() => setFlash(false), 180);
      prev.current = hp;
      return () => window.clearTimeout(t);
    }
    prev.current = hp;
  }, [hp]);
  return <div className={cn(className, flash && "fx-hit")}>{children}</div>;
}
