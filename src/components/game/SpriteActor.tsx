import { useEffect, useMemo, useState } from "react";
import { spriteBox, spriteFrames, spriteTint, type SpriteBox, type SpritePose } from "@/lib/game/sprites";
import { cn } from "@/lib/utils";

export function SpriteActor({
  defId,
  pose,
  box,
  facing = "right",
  className,
}: {
  defId: string;
  pose: SpritePose;
  box?: SpriteBox;
  facing?: "left" | "right";
  className?: string;
}) {
  const idle = useMemo(() => spriteFrames(defId, "idle"), [defId]);
  const attack = useMemo(() => spriteFrames(defId, "attack"), [defId]);
  const hurt = useMemo(() => spriteFrames(defId, "hurt"), [defId]);
  const [ready, setReady] = useState<Set<string>>(() => new Set());
  const [anim, setAnim] = useState({ pose: "idle" as SpritePose, blend: 0 });
  const dim = box ?? spriteBox(defId);

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
  }, [defId, idle, attack, hurt]);

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
  const tint = spriteTint(defId);

  return (
    <div
      className={cn(
        "sprite-actor relative overflow-visible",
        shownPose === "idle" && "sprite-breathe",
        shownPose === "attack" && (facing === "right" ? "sprite-lunge-r" : "sprite-lunge-l"),
        shownPose === "hurt" && "sprite-recoil",
        defId !== "player" && "foe-sprite",
        className,
      )}
      style={{
        ["--sprite-w" as string]: `${dim.w}px`,
        ["--sprite-h" as string]: `${dim.h}px`,
        ...(tint ? { filter: tint } : null),
      }}
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
            className="pointer-events-none absolute bottom-0 left-1/2 max-h-full max-w-full w-auto h-auto object-contain object-bottom"
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
