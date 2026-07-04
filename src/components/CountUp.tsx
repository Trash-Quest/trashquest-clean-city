import { useEffect, useRef, useState } from "react";
import { useInView } from "@/hooks/use-in-view";

type CountUpProps = {
  value: number;
  /** Animation length in ms. Default 1500. */
  duration?: number;
  prefix?: string;
  suffix?: string;
  /** Decimal places to show. Default 0. */
  decimals?: number;
  className?: string;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Ease-out cubic — fast start, gentle landing. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts up from 0 to `value` once it scrolls into view.
 * Renders the final value immediately when reduced motion is preferred.
 */
export function CountUp({
  value,
  duration = 1500,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: CountUpProps) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplay(value * easeOut(progress));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [inView, value, duration]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
