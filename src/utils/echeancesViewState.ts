export type FiltreEcheances = "toutes" | "aPointer" | "aVenir" | "encaissees";

export interface VueEcheances {
  scrollY: number;
  filtre: FiltreEcheances | null;
}

const CLE = "club-deal-echeances-view";

export function enregistrerVueEcheances(vue: VueEcheances): void {
  try {
    sessionStorage.setItem(CLE, JSON.stringify(vue));
  } catch {
    // sessionStorage indisponible : la restauration est simplement ignorée.
  }
}

export function lireVueEcheances(): VueEcheances | null {
  try {
    const brut = sessionStorage.getItem(CLE);
    if (!brut) return null;
    const vue = JSON.parse(brut) as VueEcheances;
    if (typeof vue?.scrollY !== "number") return null;
    return vue;
  } catch {
    return null;
  }
}

export function effacerVueEcheances(): void {
  try {
    sessionStorage.removeItem(CLE);
  } catch {
    // sessionStorage indisponible : rien à effacer.
  }
}
