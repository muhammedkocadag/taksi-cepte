import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Rakam değişince eski değerden yenisine kısa bir sayma animasyonu yapar.
// Sistemde "Hareketi azalt" açıksa direkt yeni değeri gösterir.
export function useCountUp(target: number, ms = 650) {
  const [value, setValue] = useState(target);
  const shown = useRef(target);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce || shown.current === target) {
        shown.current = target;
        setValue(target);
        return;
      }
      const from = shown.current;
      const t0 = Date.now();
      const step = () => {
        const p = Math.min(1, (Date.now() - t0) / ms);
        const v = from + (target - from) * (1 - Math.pow(1 - p, 3));
        shown.current = v;
        setValue(v);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [target, ms]);

  return value;
}
