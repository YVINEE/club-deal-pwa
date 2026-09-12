import { describe, expect, it } from "vitest";
import { Echeance } from "../types";
import {
  calculerSyntheseAnnuelle,
  calculerSyntheseDashboard,
  capitalMoyenEngage,
  DashboardDeal,
  pointsPourPeriode,
} from "./dashboard";

function d(valeur: string): Date {
  const [annee, mois, jour] = valeur.split("-").map(Number);
  return new Date(annee, mois - 1, jour, 12);
}

const deal = (
  montant: number,
  dateDebut: string,
  details: Partial<DashboardDeal["deal"]> = {},
  echeances: Echeance[] = [],
): DashboardDeal => ({
  deal: {
    id: crypto.randomUUID(),
    nom: "Deal test",
    dateDebut: d(dateDebut),
    montant,
    rendementAnnuel: 8,
    frequence: "trimestriel",
    dureeInitiale: 12,
    nombreMaxProlongations: 0,
    dureeProlongationMois: 0,
    ...details,
  },
  echeances,
});

const echeance = (dealId: string, date: string, montant: number, encaissee = false): Echeance => ({
  id: crypto.randomUUID(),
  dealId,
  date: d(date),
  montant,
  encaissee,
});

describe("calculerSyntheseDashboard", () => {
  it("calcule les montants acquis et futurs", () => {
    const premier = deal(10000, "2025-01-01");
    premier.echeances = [
      echeance(premier.deal.id, "2025-04-01", 200),
      echeance(premier.deal.id, "2026-04-01", 200),
    ];

    expect(calculerSyntheseDashboard([premier], d("2025-06-01"))).toMatchObject({
      totalInvesti: 10000,
      apportsExternesNets: 10000,
      capitalEngage: 10000,
      capitalRecupere: 0,
      interetsAcquis: 200,
      interetsFuturs: 200,
      totalActuel: 10200,
      valeurActuelle: 10200,
      totalFinal: 10400,
      performanceBrute: 2,
      rendementMoyenPondere: 8,
    });
  });

  it("calcule le rendement moyen avec la fiscalité actuelle", () => {
    const ancienDeal = deal(10000, "2025-01-01", { appliquerEvolutionFiscale: true });

    expect(calculerSyntheseDashboard([ancienDeal], d("2026-02-01")).rendementMoyenPondere).toBe(7.8);
  });

  it("génère une courbe cumulée et identifie la prochaine échéance", () => {
    const premier = deal(1000, "2025-01-01");
    premier.echeances = [
      echeance(premier.deal.id, "2025-02-01", 10),
      echeance(premier.deal.id, "2025-08-01", 10),
    ];

    const synthese = calculerSyntheseDashboard([premier], d("2025-06-01"));

    expect(synthese.prochaineEcheance?.id).toBe(premier.echeances[1].id);
    expect(synthese.pointsCourbe.map((point) => point.valeur)).toEqual([1000, 1010, 1020]);
    expect(synthese.pointsCourbe.map((point) => point.projection)).toEqual([false, false, true]);
  });

  it("utilise les statuts d'encaissement quand le suivi est actif", () => {
    const premier = deal(1000, "2025-01-01");
    const pointe = echeance(premier.deal.id, "2025-02-01", 10, true);
    const aPointer = echeance(premier.deal.id, "2025-03-01", 10, false);
    premier.echeances = [pointe, aPointer];

    const synthese = calculerSyntheseDashboard([premier], d("2025-06-01"), {
      suiviEncaissements: true,
    });

    expect(synthese.interetsAcquis).toBe(10);
    expect(synthese.interetsFuturs).toBe(10);
    expect(synthese.prochaineEcheance?.id).toBe(aPointer.id);
    expect(synthese.pointsCourbe.map((point) => point.projection)).toEqual([false, false, true]);
  });

  it("calcule le mini résumé financier d'un deal", () => {
    const premier = deal(10000, "2025-01-01");
    premier.echeances = [
      echeance(premier.deal.id, "2025-02-01", 250, true),
      echeance(premier.deal.id, "2026-02-01", 250),
    ];

    expect(
      calculerSyntheseDashboard([premier], d("2025-06-01"), { suiviEncaissements: true }),
    ).toMatchObject({
      totalInvesti: 10000,
      interetsAcquis: 250,
      interetsFuturs: 250,
      totalFinal: 10500,
    });
  });

  it("ne compte pas deux fois un capital réinvesti et distingue engagé et récupéré", () => {
    const source = deal(10000, "2025-01-01");
    const destination = deal(6000, "2026-02-01", {
      reinvestissement: { sourceDealId: source.deal.id, montant: 4000 },
    });

    const synthese = calculerSyntheseDashboard([source, destination], d("2026-03-01"), {
      capitalEngageNet: true,
    });

    expect(synthese.totalInvesti).toBe(12000);
    expect(synthese.apportsExternesNets).toBe(12000);
    expect(synthese.capitalEngage).toBe(6000);
    expect(synthese.capitalRecupere).toBe(6000);
    expect(synthese.valeurActuelle).toBe(12000);
  });

  it("bascule le capital d'un deal terminé en capital récupéré", () => {
    const source = deal(10000, "2025-01-01");
    source.echeances = [
      echeance(source.deal.id, "2025-04-01", 300),
      echeance(source.deal.id, "2026-04-01", 300),
    ];

    const synthese = calculerSyntheseDashboard([source], d("2026-03-01"));

    expect(synthese.capitalEngage).toBe(0);
    expect(synthese.capitalRecupere).toBe(10000);
    expect(synthese.interetsAcquis).toBe(300);
    expect(synthese.valeurActuelle).toBe(10300);
    expect(synthese.totalFinal).toBe(10600);
  });

  it("gère les chaînes de réinvestissement", () => {
    const a = deal(10000, "2025-01-01");
    const b = deal(8000, "2026-01-02", {
      reinvestissement: { sourceDealId: a.deal.id, montant: 5000 },
    });
    const c = deal(5000, "2027-01-03", {
      reinvestissement: { sourceDealId: b.deal.id, montant: 4000 },
    });

    const synthese = calculerSyntheseDashboard([a, b, c], d("2027-06-01"), {
      capitalEngageNet: true,
    });

    expect(synthese.apportsExternesNets).toBe(14000);
    expect(synthese.capitalEngage).toBe(5000);
    expect(synthese.capitalRecupere).toBe(9000);
  });
});

describe("capitalMoyenEngage", () => {
  it("moyenne le capital engagé sur la période", () => {
    const premier = deal(10000, "2025-01-01");

    expect(capitalMoyenEngage([premier], d("2025-01-01"), d("2026-01-01"))).toBe(10000);
    expect(capitalMoyenEngage([premier], d("2026-01-01"), d("2027-01-01"))).toBe(0);
  });
});

describe("calculerSyntheseAnnuelle", () => {
  const creerPortefeuille = () => {
    const a = deal(10000, "2025-02-01");
    a.echeances = [
      echeance(a.deal.id, "2025-05-01", 200),
      echeance(a.deal.id, "2025-08-01", 200),
      echeance(a.deal.id, "2025-11-01", 200),
      echeance(a.deal.id, "2026-02-01", 200),
    ];
    const b = deal(6000, "2026-03-01", {
      reinvestissement: { sourceDealId: a.deal.id, montant: 4000 },
    });
    b.echeances = [
      echeance(b.deal.id, "2026-06-01", 120),
      echeance(b.deal.id, "2026-09-01", 120),
      echeance(b.deal.id, "2026-12-01", 120),
      echeance(b.deal.id, "2027-03-01", 120),
    ];
    return [a, b];
  };

  it("agrège une année complète", () => {
    const syntheses = calculerSyntheseAnnuelle(creerPortefeuille(), d("2026-06-15"));
    const premiere = syntheses.find((synthese) => synthese.annee === 2025);

    expect(syntheses.map((synthese) => synthese.annee)).toEqual([2025, 2026, 2027]);
    expect(premiere).toMatchObject({
      terminee: true,
      enCours: false,
      capitalEngageOuverture: 0,
      capitalEngageCloture: 10000,
      cashOuverture: 0,
      cashCloture: 0,
      nouveauxPlacements: 10000,
      remboursements: 0,
      reinvestissements: 0,
      interetsAnnee: 600,
      interetsAcquisAnnee: 600,
      interetsFutursAnnee: 0,
      gainsFutursRestants: 680,
      apportsAVenir: 2000,
      valeurCloture: 10600,
      totalFinalPrevu: 13280,
    });
  });

  it("distingue les mouvements de réinvestissement et de remboursement", () => {
    const syntheses = calculerSyntheseAnnuelle(creerPortefeuille(), d("2026-06-15"));
    const deuxieme = syntheses.find((synthese) => synthese.annee === 2026);

    expect(deuxieme).toMatchObject({
      terminee: false,
      enCours: true,
      capitalEngageOuverture: 10000,
      capitalEngageCloture: 6000,
      cashOuverture: 0,
      cashCloture: 6000,
      nouveauxPlacements: 6000,
      remboursements: 10000,
      reinvestissements: 4000,
      interetsAnnee: 560,
      interetsAcquisAnnee: 320,
      interetsFutursAnnee: 240,
      gainsFutursRestants: 120,
      apportsAVenir: 0,
      valeurCloture: 13160,
      totalFinalPrevu: 13280,
    });
  });

  it("projette la clôture au-delà des deals", () => {
    const syntheses = calculerSyntheseAnnuelle(creerPortefeuille(), d("2026-06-15"));
    const troisieme = syntheses.find((synthese) => synthese.annee === 2027);

    expect(troisieme).toMatchObject({
      terminee: false,
      enCours: false,
      capitalEngageOuverture: 6000,
      capitalEngageCloture: 0,
      cashOuverture: 6000,
      cashCloture: 12000,
      remboursements: 6000,
      interetsAnnee: 120,
      gainsFutursRestants: 0,
      valeurCloture: 13280,
      totalFinalPrevu: 13280,
    });
  });
});

describe("pointsPourPeriode", () => {
  it("ajoute des points d'ancrage aux bornes de la période", () => {
    const points = [
      { date: d("2025-01-01"), valeur: 1000, projection: false },
      { date: d("2025-06-01"), valeur: 1100, projection: false },
      { date: d("2026-03-01"), valeur: 1200, projection: true },
    ];

    const resultat = pointsPourPeriode(points, d("2025-01-01"), d("2026-01-01"), d("2025-10-01"));

    expect(resultat.map((point) => point.date.toISOString().slice(0, 10))).toEqual([
      "2025-01-01",
      "2025-06-01",
      "2026-01-01",
    ]);
    expect(resultat.map((point) => point.valeur)).toEqual([1000, 1100, 1100]);
    expect(resultat.map((point) => point.projection)).toEqual([false, false, true]);
  });
});
