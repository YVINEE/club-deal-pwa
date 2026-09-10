export type Frequence = "trimestriel" | "semestriel";

export type StatutDeal = "actif" | "enProlongation" | "termine";

export interface Deal {
  id: string;
  nom: string;
  dateDebut: Date;
  montant: number;
  rendementAnnuel: number; // en %
  frequence: Frequence;
  dureeInitiale: number; // en mois
  nombreMaxProlongations: number;
  dureeProlongationMois: number;
  appliquerEvolutionFiscale?: boolean;
}

export interface Prolongation {
  id: string;
  dealId: string;
  dateDebut: Date;
  dateFin: Date;
  ordre: number; // 1ère, 2ème prolongation...
}

export interface Echeance {
  id: string;
  dealId: string;
  date: Date;
  montant: number; // toujours un versement d'intérêt
  encaissee: boolean;
}
