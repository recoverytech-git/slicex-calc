import { useEffect, useRef, useState } from "react";

/**
 * Anima um número contando do valor anterior até o novo valor.
 * Microinteração de "delight" — comunica que o resultado é novo/calculado,
 * sem interromper a leitura (EAOS Cap. 46).
 */
export default function AnimatedNumber({ value, format, duration = 600 }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const start = performance.now();

    cancelAnimationFrame(rafRef.current);

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <>{format ? format(display) : display}</>;
}
