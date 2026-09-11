import { Deal, Prolongation, Echeance } from "../types";
import { addMonths, frequenceEnMois, parseDateInput } from "./dateUtils";
import { dateFinCourante, peutProlonger } from "./statusUtils";

export const DATE_CHANGEMENT_FISCALITE = "2026-01-01";
export const TAUX_PRELEVEMENT_AVANT_2026 = 30;
export const TAUX_PRELEVEMENT_DEPUIS_2026 = 31.4;
export const MAX_DUREE_MOIS = 1200;

export function dealCommenceAvantEvolutionFiscale(dateDebut: Date): boolean {
  return dateDebut < parseDateInput(DATE_CHANGEMENT_FISCALITE);
}

export function dealEligibleEvolutionFiscale(dateDebut: Date, dureeInitiale: number): boolean {
  return dealCommenceAvantEvolutionFiscale(dateDebut)
    && addMonths(dateDebut, dureeInitiale) > parseDateInput(DATE_CHANGEMENT_FISCALITE);
}

export function calculMontantInteret(deal: Deal): number {
  return calculerCouponEstime(deal.montant, deal.rendementAnnuel, deal.frequence);
}

export function calculerCouponEstime(montant: number, rendementAnnuel: number, frequence: Deal["frequence"]): number {
  const freqMois = frequenceEnMois(frequence);
  return montant * (rendementAnnuel / 100) * (freqMois / 12);
}

export function calculerTauxNetEffectif(
  rendementNet: number,
  dateDebut: Date,
  dateEcheance: Date,
  appliquerEvolutionFiscale = false,
): number {
  const changement = parseDateInput(DATE_CHANGEMENT_FISCALITE);
  if (!appliquerEvolutionFiscale || !dealCommenceAvantEvolutionFiscale(dateDebut) || dateEcheance < changement) return rendementNet;
  const tauxAjuste = rendementNet
    * (1 - TAUX_PRELEVEMENT_DEPUIS_2026 / 100)
    / (1 - TAUX_PRELEVEMENT_AVANT_2026 / 100);
  return Math.round((tauxAjuste + Number.EPSILON) * 10) / 10;
}

export function calculerCouponPourDate(
  montant: number,
  rendementNet: number,
  frequence: Deal["frequence"],
  dateDebut: Date,
  dateEcheance: Date,
  appliquerEvolutionFiscale = false,
  montantCouponApresEvolutionFiscale?: number,
): number {
  if (
    appliquerEvolutionFiscale &&
    montantCouponApresEvolutionFiscale !== undefined &&
    dateEcheance >= parseDateInput(DATE_CHANGEMENT_FISCALITE)
  ) {
    return montantCouponApresEvolutionFiscale;
  }
  const tauxNetEffectif = calculerTauxNetEffectif(rendementNet, dateDebut, dateEcheance, appliquerEvolutionFiscale);
  return montant * (tauxNetEffectif / 100) * (frequenceEnMois(frequence) / 12);
}

export function genererEcheances(deal: Deal, prolongations: Prolongation[]): Echeance[] {
  const echeances: Echeance[] = [];
  const freqMois = frequenceEnMois(deal.frequence);

  genererEcheancesPourPeriode(
    deal.id,
    deal.dateDebut,
    deal.dureeInitiale,
    freqMois,
    deal,
    echeances
  );

  const prolongationsTriees = [...prolongations].sort((a, b) => a.ordre - b.ordre);
  for (const prolongation of prolongationsTriees) {
    genererEcheancesPourPeriode(
      deal.id,
      prolongation.dateDebut,
      deal.dureeProlongationMois,
      freqMois,
      deal,
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
  deal: Deal,
  echeances: Echeance[]
): void {
  let dateCourante = addMonths(dateDebut, freqMois);
  const dateFinPeriode = addMonths(dateDebut, dureeMois);

  while (dateCourante <= dateFinPeriode) {
    echeances.push({
      id: crypto.randomUUID(),
      dealId,
      date: dateCourante,
      montant: calculerCouponPourDate(
        deal.montant,
        deal.rendementAnnuel,
        deal.frequence,
        deal.dateDebut,
        dateCourante,
        deal.appliquerEvolutionFiscale === true,
        deal.montantCouponApresEvolutionFiscale,
      ),
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
