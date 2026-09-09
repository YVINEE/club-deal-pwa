import { Deal, Echeance, StatutDeal } from "../types";

export interface DashboardDeal {
  deal: Deal;
  echeances: Echeance[];
  statut?: StatutDeal;
}

export interface PointCourbe {
  date: Date;
  valeur: number;
  projection: boolean;
}

export interface SyntheseDashboard {
  totalInvesti: number;
  interetsAcquis: number;
  interetsFuturs: number;
  totalActuel: number;
  totalFinal: number;
  performanceBrute: number;
  rendementMoyenPondere: number;
  prochaineEcheance?: Echeance;
  prochaineEcheanceDealNom?: string;
  pointsCourbe: PointCourbe[];
}

function arrondirMontant(montant: number): number {
  return Math.round((montant + Number.EPSILON) * 100) / 100;
}

export function calculerSyntheseDashboard(
  deals: DashboardDeal[],
  maintenant: Date = new Date()
): SyntheseDashboard {
  const echeances = deals.flatMap(({ echeances: dealEcheances }) => dealEcheances);
  const interetsAcquis = echeances
    .filter((echeance) => echeance.date <= maintenant)
    .reduce((total, echeance) => total + echeance.montant, 0);
  const interetsFuturs = echeances
    .filter((echeance) => echeance.date > maintenant)
    .reduce((total, echeance) => total + echeance.montant, 0);
  const totalInvesti = deals.reduce((total, { deal }) => total + deal.montant, 0);
  const rendementMoyenPondere =
    totalInvesti === 0
      ? 0
      : deals.reduce((total, { deal }) => total + deal.montant * deal.rendementAnnuel, 0) / totalInvesti;
  const prochaineEcheance = echeances
    .filter((echeance) => echeance.date > maintenant)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  return {
    totalInvesti: arrondirMontant(totalInvesti),
    interetsAcquis: arrondirMontant(interetsAcquis),
    interetsFuturs: arrondirMontant(interetsFuturs),
    totalActuel: arrondirMontant(totalInvesti + interetsAcquis),
    totalFinal: arrondirMontant(totalInvesti + interetsAcquis + interetsFuturs),
    performanceBrute: totalInvesti === 0 ? 0 : arrondirMontant((interetsAcquis / totalInvesti) * 100),
    rendementMoyenPondere: arrondirMontant(rendementMoyenPondere),
    prochaineEcheance,
    prochaineEcheanceDealNom: deals.find(({ echeances: dealEcheances }) =>
      dealEcheances.some((echeance) => echeance.id === prochaineEcheance?.id)
    )?.deal.nom,
    pointsCourbe: creerPointsCourbe(deals, maintenant),
  };
}

export function creerPointsCourbe(deals: DashboardDeal[], maintenant: Date = new Date()): PointCourbe[] {
  const evenements = deals.flatMap(({ deal, echeances }) => [
    { date: deal.dateDebut, variation: deal.montant },
    ...echeances.map((echeance) => ({ date: echeance.date, variation: echeance.montant })),
  ]);

  evenements.sort((a, b) => a.date.getTime() - b.date.getTime());

  let valeur = 0;
  return evenements.map(({ date, variation }) => {
    valeur = arrondirMontant(valeur + variation);
    return { date, valeur, projection: date > maintenant };
  });
}
