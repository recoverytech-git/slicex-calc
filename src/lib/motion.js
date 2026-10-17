/** Movimento padrão do sistema. Toda tela e todo card usam estes valores. */
const EASE = [0.16, 1, 0.3, 1];
export const ENTRADA = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: EASE } };
export const FADE = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.25 } };
export const PAGINA = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.35, ease: EASE } };
