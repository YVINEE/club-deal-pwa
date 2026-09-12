import { Deal, Echeance, Prolongation, StatutDeal } from "../types";
import { calculerTauxNetEffectif } from "./calculs";
import { calculerCapitalEngageNet } from "./reinvestissements";
import { dateFinCourante } from "./statusUtils";

export interface DashboardDeal {
  deal: Deal;
  echeances: Echeance[];
  statut?: StatutDeal;
  prolongations?: Prolongation[];
  dateFin?: Date;
}

export interface PointCourbe {
  date: Date;
  valeur: number;
  projection: boolean;
}

export interface SyntheseDashboard {
  /** Somme des montants de tous les deals (ou apports externes nets si capitalEngageNet). */
  totalInvesti: number;
  /** Capital réellement apporté de l'extérieur (montants − réinvestissements). */
  apportsExternesNets: number;
  /** Capital en cours sur des deals non terminés à l'instant présent. */
  capitalEngage: number;
  /** Capital remboursé par les deals terminés, non réinvesti (disponible). */
  capitalRecupere: number;
  interetsAcquis: number;
  interetsFuturs: number;
  totalActuel: number;
  valeurActuelle: number;
  totalFinal: number;
  performanceBrute: number;
  rendementMoyenPondere: number;
  prochaineEcheance?: Echeance;
  prochaineEcheanceDealNom?: string;
  pointsCourbe: PointCourbe[];
}

export interface SyntheseAnnuelle {
  annee: number;
  terminee: boolean;
  enCours: boolean;
  capitalEngageOuverture: number;
  capitalEngageCloture: number;
  cashOuverture: number;
  cashCloture: number;
  nouveauxPlacements: number;
  remboursements: number;
  reinvestissements: number;
  interetsAnnee: number;
  interetsAcquisAnnee: number;
  interetsFutursAnnee: number;
  gainsFutursRestants: number;
  apportsAVenir: number;
  valeurCloture: number;
  totalFinalPrevu: number;
  capitalMoyenEngage: number;
  performanceAnnee: number;
}

export interface OptionsDashboard {
  suiviEncaissements?: boolean;
  capitalEngageNet?: boolean;
}

function arrondirMontant(montant: number): number {
  return Math.round((montant + Number.EPSILON) * 100) / 100;
}

function montantReinvesti(deal: Deal): number {
  return deal.reinvestissement?.montant ?? 0;
}

function dateFinDeal({ deal, prolongations, dateFin }: DashboardDeal): Date {
  if (dateFin) return dateFin;
  return dateFinCourante(deal, prolongations ?? []);
}

function estAcquise(echeance: Echeance, maintenant: Date, suiviEncaissements: boolean): boolean {
  return suiviEncaissements ? echeance.encaissee : echeance.date <= maintenant;
}

export function capitalEngageA(deals: DashboardDeal[], date: Date): number {
  return arrondirMontant(
    deals.reduce((total, dashboardDeal) => {
      const debut = dashboardDeal.deal.dateDebut;
      const fin = dateFinDeal(dashboardDeal);
      return total + (debut <= date && date < fin ? dashboardDeal.deal.montant : 0);
    }, 0),
  );
}

export function capitalRecupereA(deals: DashboardDeal[], date: Date): number {
  return arrondirMontant(
    deals.reduce((total, dashboardDeal) => {
      const debut = dashboardDeal.deal.dateDebut;
      const fin = dateFinDeal(dashboardDeal);
      const rembourse = fin <= date ? dashboardDeal.deal.montant : 0;
      const reinvesti = debut <= date ? montantReinvesti(dashboardDeal.deal) : 0;
      return total + rembourse - reinvesti;
    }, 0),
  );
}

export function capitalMoyenEngage(deals: DashboardDeal[], debut: Date, fin: Date): number {
  const duree = fin.getTime() - debut.getTime();
  if (duree <= 0) return 0;

  const evenements: Array<{ date: number; variation: number }> = [];
  for (const dashboardDeal of deals) {
    evenements.push({ date: dashboardDeal.deal.dateDebut.getTime(), variation: dashboardDeal.deal.montant });
    evenements.push({ date: dateFinDeal(dashboardDeal).getTime(), variation: -dashboardDeal.deal.montant });
  }
  evenements.sort((a, b) => a.date - b.date);

  let solde = 0;
  for (const evenement of evenements) {
    if (evenement.date <= debut.getTime()) solde += evenement.variation;
  }

  let precedente = debut.getTime();
  let aire = 0;
  for (const evenement of evenements) {
    if (evenement.date <= debut.getTime() || evenement.date >= fin.getTime()) continue;
    aire += solde * (evenement.date - precedente);
    solde += evenement.variation;
    precedente = evenement.date;
  }
  aire += solde * (fin.getTime() - precedente);

  return arrondirMontant(aire / duree);
}

export function calculerSyntheseDashboard(
  deals: DashboardDeal[],
  maintenant: Date = new Date(),
  options: OptionsDashboard = {},
): SyntheseDashboard {
  const suiviEncaissements = options.suiviEncaissements === true;
  const capitalEngageNet = options.capitalEngageNet === true;
  const echeances = deals.flatMap(({ echeances: dealEcheances }) => dealEcheances);
  const interetsAcquis = echeances
    .filter((echeance) => estAcquise(echeance, maintenant, suiviEncaissements))
    .reduce((total, echeance) => total + echeance.montant, 0);
  const interetsFuturs = echeances
    .filter((echeance) => !estAcquise(echeance, maintenant, suiviEncaissements))
    .reduce((total, echeance) => total + echeance.montant, 0);
  const totalInvesti = capitalEngageNet
    ? calculerCapitalEngageNet(deals.map(({ deal }) => deal))
    : deals.reduce((total, { deal }) => total + deal.montant, 0);
  const capitalEngage = capitalEngageA(deals, maintenant);
  const capitalRecupere = capitalRecupereA(deals, maintenant);
  const valeurActuelle = arrondirMontant(capitalEngage + capitalRecupere + interetsAcquis);
  const rendementMoyenPondere =
    totalInvesti === 0
      ? 0
      : deals.reduce(
          (total, { deal }) =>
            total +
            (capitalEngageNet ? deal.montant - montantReinvesti(deal) : deal.montant) *
              calculerTauxNetEffectif(
                deal.rendementAnnuel,
                deal.dateDebut,
                maintenant,
                deal.appliquerEvolutionFiscale === true,
              ),
          0,
        ) / totalInvesti;
  const prochaineEcheance = echeances
    .filter((echeance) => !estAcquise(echeance, maintenant, suiviEncaissements))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  return {
    totalInvesti: arrondirMontant(totalInvesti),
    apportsExternesNets: arrondirMontant(calculerCapitalEngageNet(deals.map(({ deal }) => deal))),
    capitalEngage,
    capitalRecupere,
    interetsAcquis: arrondirMontant(interetsAcquis),
    interetsFuturs: arrondirMontant(interetsFuturs),
    totalActuel: valeurActuelle,
    valeurActuelle,
    totalFinal: arrondirMontant(
      calculerCapitalEngageNet(deals.map(({ deal }) => deal)) + interetsAcquis + interetsFuturs,
    ),
    performanceBrute:
      totalInvesti === 0 ? 0 : arrondirMontant((interetsAcquis / totalInvesti) * 100),
    rendementMoyenPondere: arrondirMontant(rendementMoyenPondere),
    prochaineEcheance,
    prochaineEcheanceDealNom: deals.find(({ echeances: dealEcheances }) =>
      dealEcheances.some((echeance) => echeance.id === prochaineEcheance?.id),
    )?.deal.nom,
    pointsCourbe: creerPointsCourbe(deals, maintenant, options),
  };
}

export function calculerSyntheseAnnuelle(
  deals: DashboardDeal[],
  maintenant: Date = new Date(),
  options: OptionsDashboard = {},
): SyntheseAnnuelle[] {
  if (deals.length === 0) return [];
  const suiviEncaissements = options.suiviEncaissements === true;
  const echeances = deals.flatMap(({ echeances: dealEcheances }) => dealEcheances);

  const debuts = deals.map(({ deal }) => deal.dateDebut.getTime());
  const fins = deals.map((dashboardDeal) => dateFinDeal(dashboardDeal).getTime());
  const premiereAnnee = new Date(Math.min(...debuts)).getFullYear();
  const derniereAnnee = new Date(Math.max(...fins)).getFullYear();

  const syntheses: SyntheseAnnuelle[] = [];
  for (let annee = premiereAnnee; annee <= derniereAnnee; annee++) {
    const ouverture = new Date(annee, 0, 1, 12);
    const cloture = new Date(annee + 1, 0, 1, 12);
    const instantCloture = new Date(cloture.getTime() - 1);
    const dansAnnee = (date: Date) => date >= ouverture && date < cloture;
    const sommeDeals = (selection: (dashboardDeal: DashboardDeal) => number) =>
      arrondirMontant(deals.reduce((total, dashboardDeal) => total + selection(dashboardDeal), 0));
    const sommeEcheances = (selection: (echeance: Echeance) => number) =>
      arrondirMontant(echeances.reduce((total, echeance) => total + selection(echeance), 0));

    const nouveauxPlacements = sommeDeals(({ deal }) =>
      dansAnnee(deal.dateDebut) ? deal.montant : 0,
    );
    const remboursements = sommeDeals((dashboardDeal) =>
      dansAnnee(dateFinDeal(dashboardDeal)) ? dashboardDeal.deal.montant : 0,
    );
    const reinvestissements = sommeDeals(({ deal }) =>
      dansAnnee(deal.dateDebut) ? montantReinvesti(deal) : 0,
    );
    const interetsAnnee = sommeEcheances((echeance) =>
      dansAnnee(echeance.date) ? echeance.montant : 0,
    );
    const interetsAcquisAnnee = sommeEcheances((echeance) =>
      dansAnnee(echeance.date) && estAcquise(echeance, maintenant, suiviEncaissements)
        ? echeance.montant
        : 0,
    );
    const interetsFutursAnnee = arrondirMontant(interetsAnnee - interetsAcquisAnnee);
    const gainsFutursRestants = sommeEcheances((echeance) =>
      echeance.date >= cloture ? echeance.montant : 0,
    );
    const apportsAVenir = sommeDeals(({ deal }) =>
      deal.dateDebut >= cloture ? deal.montant - montantReinvesti(deal) : 0,
    );
    const interetsCumulesCloture = sommeEcheances((echeance) =>
      echeance.date < cloture ? echeance.montant : 0,
    );

    const capitalEngageOuverture = capitalEngageA(deals, ouverture);
    const capitalEngageCloture = capitalEngageA(deals, instantCloture);
    const cashOuverture = capitalRecupereA(deals, ouverture);
    const cashCloture = capitalRecupereA(deals, instantCloture);
    const moyen = capitalMoyenEngage(deals, ouverture, cloture);
    const valeurCloture = arrondirMontant(
      capitalEngageCloture + cashCloture + interetsCumulesCloture,
    );

    syntheses.push({
      annee,
      terminee: cloture <= maintenant,
      enCours: ouverture <= maintenant && maintenant < cloture,
      capitalEngageOuverture,
      capitalEngageCloture,
      cashOuverture,
      cashCloture,
      nouveauxPlacements,
      remboursements,
      reinvestissements,
      interetsAnnee,
      interetsAcquisAnnee,
      interetsFutursAnnee,
      gainsFutursRestants,
      apportsAVenir,
      valeurCloture,
      totalFinalPrevu: arrondirMontant(valeurCloture + gainsFutursRestants + apportsAVenir),
      capitalMoyenEngage: moyen,
      performanceAnnee: moyen === 0 ? 0 : arrondirMontant((interetsAnnee / moyen) * 100),
    });
  }

  return syntheses;
}

export function creerPointsCourbe(
  deals: DashboardDeal[],
  maintenant: Date = new Date(),
  options: OptionsDashboard = {},
): PointCourbe[] {
  const suiviEncaissements = options.suiviEncaissements === true;
  const evenements = deals.flatMap(({ deal, echeances }) => [
    {
      date: deal.dateDebut,
      variation: deal.montant - montantReinvesti(deal),
      projection: deal.dateDebut > maintenant,
    },
    ...echeances.map((echeance) => ({
      date: echeance.date,
      variation: echeance.montant,
      projection: !estAcquise(echeance, maintenant, suiviEncaissements),
    })),
  ]);

  evenements.sort((a, b) => a.date.getTime() - b.date.getTime());

  let valeur = 0;
  return evenements.map(({ date, variation, projection }) => {
    valeur = arrondirMontant(valeur + variation);
    return { date, valeur, projection };
  });
}

function valeurAu(points: PointCourbe[], date: Date): number {
  let valeur = 0;
  for (const point of points) {
    if (point.date.getTime() > date.getTime()) break;
    valeur = point.valeur;
  }
  return valeur;
}

export function pointsPourPeriode(
  points: PointCourbe[],
  debut: Date,
  fin: Date,
  maintenant: Date = new Date(),
): PointCourbe[] {
  if (points.length === 0 || fin.getTime() < debut.getTime()) return [];

  const interieurs = points.filter(
    (point) => point.date.getTime() > debut.getTime() && point.date.getTime() < fin.getTime(),
  );

  return [
    { date: debut, valeur: valeurAu(points, debut), projection: debut > maintenant },
    ...interieurs,
    { date: fin, valeur: valeurAu(points, fin), projection: fin > maintenant },
  ];
}
