import { ElementType, ReactNode } from "react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

type RevealVariant = "up" | "left" | "right" | "scale" | "fade";

type RevealProps = {
  children: ReactNode;
  /** Direction/style of the entrance. Default "up". */
  variant?: RevealVariant;
  /** Delay in ms — use for staggering lists (e.g. i * 80). */
  delay?: number;
  className?: string;
  /** Render as a different element (e.g. "section", "li"). Default "div". */
  as?: ElementType;
};

/**
 * Wraps content so it fades/slides in the first time it scrolls into view.
 * Honors prefers-reduced-motion via CSS (see index.css).
 */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className,
  as: Tag = "div",
}: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <Tag
      ref={ref}
      data-variant={variant}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={cn("will-reveal", inView && "reveal-in", className)}
    >
      {children}
    </Tag>
  );
}
