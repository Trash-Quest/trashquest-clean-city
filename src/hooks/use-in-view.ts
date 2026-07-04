import { useEffect, useRef, useState } from "react";

type Options = {
  /** Fraction of the element that must be visible to trigger (0–1). */
  threshold?: number;
  /** Margin around the root; negative bottom margin triggers a bit early. */
  rootMargin?: string;
  /** Keep the element "in view" after the first trigger (default true). */
  once?: boolean;
};

/**
 * Returns a ref + `inView` flag driven by IntersectionObserver, with a
 * scroll/resize fallback so content is never left stuck hidden in
 * environments where IO callbacks don't fire. Reveals immediately if the
 * element is already on screen at mount.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px",
  once = true,
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Synchronous visibility check — reliable everywhere, unlike IO callbacks.
    const isOnScreen = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      return (
        rect.top < vh * 0.9 &&
        rect.bottom > 0 &&
        rect.left < vw &&
        rect.right > 0
      );
    };

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    // Already visible when mounted → reveal right away.
    if (isOnScreen()) {
      setInView(true);
      if (once) return;
    }

    let settled = false;
    const reveal = () => {
      if (settled) return;
      settled = true;
      setInView(true);
      observer.disconnect();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal();
        else if (!once) setInView(false);
      },
      { threshold, rootMargin },
    );
    observer.observe(el);

    // Fallback: some environments never fire IO callbacks. A passive scroll
    // listener re-checks position so the reveal still happens on real scroll.
    const onScrollOrResize = () => {
      if (isOnScreen()) reveal();
    };
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}
