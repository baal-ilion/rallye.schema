/** Empêche de reconstruire une vue lorsque la réponse utile de l'API est inchangée. */
export function sameData(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
