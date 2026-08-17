import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Burst = { id: number; kind: "slash" | "claw" | "clang" | "break" | "gain" };

export function BodyFx({
  hp,
  block,
  wound,
}: {
  hp: number;
  block: number;
  wound: "slash" | "claw";
}) {
  const prevHp = useRef(hp);
  const prevBlock = useRef(block);
  const [burst, setBurst] = useState<Burst | null>(null);

  useEffect(() => {
    const lostHp = hp < prevHp.current;
    const lostBlock = block < prevBlock.current;
    const gainedBlock = block > prevBlock.current;
    let kind: Burst["kind"] | null = null;
    if (prevBlock.current > 0 && block === 0 && lostBlock) kind = "break";
    else if (lostBlock && !lostHp) kind = "clang";
    else if (lostHp) kind = wound;
    else if (gainedBlock) kind = "gain";
    if (kind) {
      const id = Date.now();
      setBurst({ id, kind });
      const t = window.setTimeout(() => setBurst((b) => (b?.id === id ? null : b)), 860);
      prevHp.current = hp;
      prevBlock.current = block;
      return () => window.clearTimeout(t);
    }
    prevHp.current = hp;
    prevBlock.current = block;
  }, [hp, block, wound]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible">
      {block > 0 ? (
        <div
          className={cn(
            "ward-shell",
            burst?.kind === "clang" && "ward-hit",
            burst?.kind === "gain" && "ward-gain",
          )}
        >
          <img src="/ui/ward-oval.png?v=6" alt="" className="ward-img" crossOrigin="anonymous" />
        </div>
      ) : null}
      {burst?.kind === "slash" ? (
        <img
          key={`${burst.id}-s`}
          src="/fx/slash.png?v=5"
          alt=""
          className="absolute inset-[-6%] size-[112%] object-contain fx-wound-img"
        />
      ) : null}
      {burst?.kind === "claw" ? (
        <img
          key={`${burst.id}-c`}
          src="/fx/claw.png?v=5"
          alt=""
          className="absolute inset-[-4%] size-[108%] object-contain fx-wound-img"
        />
      ) : null}
      {burst?.kind === "break" ? (
        <span key={burst.id} className="ward-break" />
      ) : null}
    </div>
  );
}
