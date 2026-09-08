import { Deal, Prolongation, StatutDeal } from "../types";
import { addMonths } from "./dateUtils";

export function dateFinCourante(deal: Deal, prolongations: Prolongation[]): Date {
  if (prolongations.length === 0) return addMonths(deal.dateDebut, deal.dureeInitiale);
  return [...prolongations].sort((a, b) => b.ordre - a.ordre)[0].dateFin;
}

export function calculerStatut(
  deal: Deal,
  prolongations: Prolongation[],
  maintenant: Date = new Date()
): StatutDeal {
  const fin = dateFinCourante(deal, prolongations);
  if (maintenant >= fin) return "termine";
  return prolongations.length === 0 ? "actif" : "enProlongation";
}

export function peutProlonger(deal: Deal, prolongations: Prolongation[]): boolean {
  return prolongations.length < deal.nombreMaxProlongations;
}
