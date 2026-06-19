import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Liquid-glass floating CTA. Fixed to viewport so it follows scroll.
 * Appears after the user scrolls past the hero.
 */
export const FloatingStartMission = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed || !visible) return null;

  const href = user ? "/report" : "/auth";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 sm:bottom-8"
      aria-live="polite"
    >
      <div className="pointer-events-auto group relative animate-fade-in">
        {/* Glow halo */}
        <div
          aria-hidden
          className="absolute -inset-3 rounded-full bg-[conic-gradient(from_120deg,hsl(var(--brand-green)/0.45),hsl(var(--brand-amber)/0.45),hsl(var(--brand-green)/0.45))] opacity-70 blur-2xl transition group-hover:opacity-100"
        />

        {/* Liquid glass shell */}
        <div className="relative flex items-center gap-2 rounded-full border border-white/40 bg-white/20 p-1.5 pl-5 shadow-[0_8px_32px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/15 dark:bg-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]">
          {/* inner sheen */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/50 via-white/0 to-white/0 opacity-70 dark:from-white/20"
          />
          {/* highlight line */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-white/70 dark:bg-white/30"
          />

          <Sparkles className="relative h-4 w-4 text-brand-amber drop-shadow" />
          <span className="relative text-sm font-bold text-ink sm:text-base">
            เริ่มภารกิจ
          </span>

          <Link
            to={href}
            className="relative ml-1 inline-flex h-10 items-center gap-1.5 rounded-full bg-gradient-to-br from-brand-green to-brand-green/80 px-4 text-sm font-bold text-brand-green-foreground shadow-[0_4px_14px_hsl(var(--brand-green)/0.5),inset_0_1px_0_rgba(255,255,255,0.4)] transition hover:scale-[1.03] active:scale-95"
          >
            ไปเลย <ArrowRight className="h-4 w-4" />
          </Link>

          <button
            onClick={() => setDismissed(true)}
            aria-label="ปิด"
            className="relative ml-0.5 mr-1 grid h-7 w-7 place-items-center rounded-full text-ink-soft transition hover:bg-white/40 hover:text-ink dark:hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingStartMission;
