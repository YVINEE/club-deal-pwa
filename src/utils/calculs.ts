import { Deal, Prolongation, Echeance } from "../types";
import { addMonths, frequenceEnMois } from "./dateUtils";
import { dateFinCourante, peutProlonger } from "./statusUtils";

export function calculMontantInteret(deal: Deal): number {
  const freqMois = frequenceEnMois(deal.frequence);
  return deal.montant * (deal.rendementAnnuel / 100) * (freqMois / 12);
}

export function genererEcheances(deal: Deal, prolongations: Prolongation[]): Echeance[] {
  const echeances: Echeance[] = [];
  const montantInteret = calculMontantInteret(deal);
  const freqMois = frequenceEnMois(deal.frequence);

  genererEcheancesPourPeriode(
    deal.id,
    deal.dateDebut,
    deal.dureeInitiale,
    freqMois,
    montantInteret,
    echeances
  );

  const prolongationsTriees = [...prolongations].sort((a, b) => a.ordre - b.ordre);
  for (const prolongation of prolongationsTriees) {
    genererEcheancesPourPeriode(
      deal.id,
      prolongation.dateDebut,
      deal.dureeProlongationMois,
      freqMois,
      montantInteret,
      echeances
    );
  }

  return echeances;
}

function genererEcheancesPourPeriode(
  dealId: string,
  dateDebut: Date,
  dureeMois: number,
  freqMois: number,
  montantInteret: number,
  echeances: Echeance[]
): void {
  let dateCourante = addMonths(dateDebut, freqMois);
  const dateFinPeriode = addMonths(dateDebut, dureeMois);

  while (dateCourante <= dateFinPeriode) {
    echeances.push({
      id: crypto.randomUUID(),
      dealId,
      date: dateCourante,
      montant: montantInteret,
      encaissee: false,
    });
    dateCourante = addMonths(dateCourante, freqMois);
  }
}

export function creerProlongation(deal: Deal, prolongationsExistantes: Prolongation[]): Prolongation {
  if (!peutProlonger(deal, prolongationsExistantes)) {
    throw new Error(`Le deal "${deal.nom}" a atteint son nombre maximum de prolongations`);
  }

  const dateDebut = dateFinCourante(deal, prolongationsExistantes);
  const dateFin = addMonths(dateDebut, deal.dureeProlongationMois);

  return {
    id: crypto.randomUUID(),
    dealId: deal.id,
    dateDebut,
    dateFin,
    ordre: prolongationsExistantes.length + 1,
  };
}
