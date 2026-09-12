export interface VueListeDeals {
  scrollY: number;
  filtre: "tous" | "actifs" | "termines";
  tri: "prochaineEcheance" | "montant" | "dateFin";
  dealId?: string;
}

const CLE = "club-deal-deals-view";

export function enregistrerVueListe(etat: VueListeDeals): void {
  try {
    sessionStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    // sessionStorage indisponible : la restauration est simplement ignorée.
  }
}

export function lireVueListe(): VueListeDeals | null {
  try {
    const brut = sessionStorage.getItem(CLE);
    if (!brut) return null;
    const etat = JSON.parse(brut) as VueListeDeals;
    if (typeof etat?.scrollY !== "number") return null;
    return etat;
  } catch {
    return null;
  }
}

export function effacerVueListe(): void {
  try {
    sessionStorage.removeItem(CLE);
  } catch {
    // sessionStorage indisponible : rien à effacer.
  }
}
