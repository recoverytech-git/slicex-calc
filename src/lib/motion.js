/** Movimento padrão do sistema. Igual ao da página Calcula-Car (referência). */
const EASE = [0.16, 1, 0.3, 1];
export const ENTRADA = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: EASE },
};
export const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: EASE },
};
export const PAGINA = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: EASE },
};
