import { Deal, Echeance, StatutDeal } from "../types";
import { calculerTauxNetEffectif } from "./calculs";
import { calculerCapitalEngageNet } from "./reinvestissements";

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

export type PeriodeCourbe = "tout" | "1a";

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
  maintenant: Date = new Date(),
  options: { suiviEncaissements?: boolean; capitalEngageNet?: boolean } = {}
): SyntheseDashboard {
  const suiviEncaissements = options.suiviEncaissements === true;
  const capitalEngageNet = options.capitalEngageNet === true;
  const echeances = deals.flatMap(({ echeances: dealEcheances }) => dealEcheances);
  const interetsAcquis = echeances
    .filter((echeance) => (suiviEncaissements ? echeance.encaissee : echeance.date <= maintenant))
    .reduce((total, echeance) => total + echeance.montant, 0);
  const interetsFuturs = echeances
    .filter((echeance) => (suiviEncaissements ? !echeance.encaissee : echeance.date > maintenant))
    .reduce((total, echeance) => total + echeance.montant, 0);
  const totalInvesti = capitalEngageNet
    ? calculerCapitalEngageNet(deals.map(({ deal }) => deal))
    : deals.reduce((total, { deal }) => total + deal.montant, 0);
  const rendementMoyenPondere =
    totalInvesti === 0
      ? 0
      : deals.reduce(
          (total, { deal }) => total + (capitalEngageNet ? deal.montant - (deal.reinvestissement?.montant ?? 0) : deal.montant) * calculerTauxNetEffectif(
            deal.rendementAnnuel,
            deal.dateDebut,
            maintenant,
            deal.appliquerEvolutionFiscale === true,
          ),
          0,
        ) / totalInvesti;
  const prochaineEcheance = echeances
    .filter((echeance) => (suiviEncaissements ? !echeance.encaissee : echeance.date > maintenant))
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
    pointsCourbe: creerPointsCourbe(deals, maintenant, options),
  };
}

export function creerPointsCourbe(
  deals: DashboardDeal[],
  maintenant: Date = new Date(),
  options: { suiviEncaissements?: boolean; capitalEngageNet?: boolean } = {}
): PointCourbe[] {
  const suiviEncaissements = options.suiviEncaissements === true;
  const capitalEngageNet = options.capitalEngageNet === true;
  const evenements = deals.flatMap(({ deal, echeances }) => [
    { date: deal.dateDebut, variation: capitalEngageNet ? deal.montant - (deal.reinvestissement?.montant ?? 0) : deal.montant, projection: false },
    ...echeances.map((echeance) => ({
      date: echeance.date,
      variation: echeance.montant,
      projection: suiviEncaissements ? !echeance.encaissee : echeance.date > maintenant,
    })),
  ]);

  evenements.sort((a, b) => a.date.getTime() - b.date.getTime());

  let valeur = 0;
  return evenements.map(({ date, variation, projection }) => {
    valeur = arrondirMontant(valeur + variation);
    return { date, valeur, projection };
  });
}

export function filtrerPointsCourbe(
  points: PointCourbe[],
  periode: PeriodeCourbe,
  maintenant: Date,
): PointCourbe[] {
  if (periode === "tout") return points;

  const limite = new Date(maintenant);
  limite.setFullYear(limite.getFullYear() + 1);
  const historiques = points.filter((point) => !point.projection && point.date <= maintenant);
  const ancrage = historiques[historiques.length - 1];
  const futurs = points.filter((point) => point.date > maintenant && point.date <= limite);

  return ancrage ? [ancrage, ...futurs] : futurs;
}
