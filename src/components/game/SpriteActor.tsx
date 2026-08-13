import { useEffect, useMemo, useState } from "react";
import { spriteFrames, type SpritePose } from "@/lib/game/sprites";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: "h-32 w-28 sm:h-44 sm:w-36",
  md: "h-40 w-32 sm:h-56 sm:w-40",
  lg: "h-48 w-36 sm:h-64 sm:w-48",
  xl: "h-[19rem] w-48 sm:h-[26rem] sm:w-72",
} as const;

export function SpriteActor({
  defId,
  pose,
  size,
  facing = "right",
  className,
}: {
  defId: string;
  pose: SpritePose;
  size: "sm" | "md" | "lg" | "xl";
  facing?: "left" | "right";
  className?: string;
}) {
  const idle = useMemo(() => spriteFrames(defId, "idle"), [defId]);
  const attack = useMemo(() => spriteFrames(defId, "attack"), [defId]);
  const hurt = useMemo(() => spriteFrames(defId, "hurt"), [defId]);
  const [ready, setReady] = useState<Set<string>>(() => new Set());
  const [anim, setAnim] = useState({ pose: "idle" as SpritePose, blend: 0 });

  useEffect(() => {
    const all = [...idle, ...attack, ...hurt];
    let live = true;
    all.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        if (!live) return;
        setReady((prev) => {
          if (prev.has(src)) return prev;
          const next = new Set(prev);
          next.add(src);
          return next;
        });
      };
      img.src = src;
    });
    return () => {
      live = false;
    };
  }, [idle, attack, hurt]);

  const attackReady = attack.length > 0 && attack.every((src) => ready.has(src));
  const hurtReady = hurt.length > 0 && hurt.every((src) => ready.has(src));
  const livePose: SpritePose =
    pose === "attack" && attackReady ? "attack" : pose === "hurt" && hurtReady ? "hurt" : "idle";

  useEffect(() => {
    setAnim({ pose: livePose, blend: 0 });
    const frames = livePose === "attack" ? attack : livePose === "hurt" ? hurt : idle;
    const period = livePose === "attack" ? 420 : livePose === "hurt" ? 280 : 1400;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      if (livePose === "attack" || livePose === "hurt") {
        const t = Math.min(1, elapsed / period);
        setAnim({ pose: livePose, blend: t * Math.max(0, frames.length - 1) });
      } else {
        const cycle = (elapsed / period) % 2;
        const tri = cycle < 1 ? cycle : 2 - cycle;
        const eased = tri * tri * (3 - 2 * tri);
        setAnim({ pose: livePose, blend: eased * Math.max(0, frames.length - 1) });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [livePose, attack, hurt, idle]);

  const shownPose = anim.pose === livePose ? anim.pose : livePose;
  const blend = anim.pose === livePose ? anim.blend : 0;

  return (
    <div
      className={cn(
        "relative overflow-visible",
        SIZE[size],
        shownPose === "idle" && "sprite-breathe",
        shownPose === "attack" && (facing === "right" ? "sprite-lunge-r" : "sprite-lunge-l"),
        shownPose === "hurt" && "sprite-recoil",
        className,
      )}
    >
      <div
        className="absolute inset-0"
        style={facing === "right" ? { transform: "scaleX(-1)" } : undefined}
      >
        <Layer frames={idle} active={shownPose === "idle"} blend={shownPose === "idle" ? blend : 0} />
        <Layer frames={attack} active={shownPose === "attack"} blend={shownPose === "attack" ? blend : 0} />
        <Layer frames={hurt} active={shownPose === "hurt"} blend={shownPose === "hurt" ? blend : 0} />
      </div>
    </div>
  );
}

function Layer({
  frames,
  active,
  blend,
}: {
  frames: string[];
  active: boolean;
  blend: number;
}) {
  const last = Math.max(0, frames.length - 1);
  const i0 = Math.max(0, Math.min(last, Math.floor(blend)));
  const i1 = Math.max(0, Math.min(last, i0 + 1));
  const frac = last < 1 ? 0 : blend - i0;
  return (
    <>
      {frames.map((src, i) => {
        let opacity = 0;
        if (active) {
          if (i === i0) opacity = 1 - frac;
          else if (i === i1) opacity = frac;
        }
        return (
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute bottom-0 left-1/2 h-full w-auto max-w-none"
            style={{
              opacity,
              willChange: "opacity",
              zIndex: active ? 2 : 1,
              transform: "translateX(-50%)",
            }}
          />
        );
      })}
    </>
  );
}
