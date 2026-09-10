import { describe, expect, it } from "vitest";
import { calculerSyntheseDashboard, DashboardDeal, filtrerPointsCourbe } from "./dashboard";

const deal = (montant: number, dateDebut: string): DashboardDeal => ({
  deal: {
    id: crypto.randomUUID(),
    nom: "Deal test",
    dateDebut: new Date(dateDebut),
    montant,
    rendementAnnuel: 8,
    frequence: "trimestriel",
    dureeInitiale: 12,
    nombreMaxProlongations: 0,
    dureeProlongationMois: 0,
  },
  echeances: [],
});

describe("calculerSyntheseDashboard", () => {
  it("calcule les montants acquis et futurs", () => {
    const premier = deal(10000, "2025-01-01");
    premier.echeances = [
      { id: "past", dealId: premier.deal.id, date: new Date("2025-04-01"), montant: 200, encaissee: false },
      { id: "future", dealId: premier.deal.id, date: new Date("2026-04-01"), montant: 200, encaissee: false },
    ];

    expect(calculerSyntheseDashboard([premier], new Date("2025-06-01"))).toMatchObject({
      totalInvesti: 10000,
      interetsAcquis: 200,
      interetsFuturs: 200,
      totalActuel: 10200,
      totalFinal: 10400,
      performanceBrute: 2,
      rendementMoyenPondere: 8,
    });
  });

  it("calcule le rendement moyen avec la fiscalité actuelle", () => {
    const ancienDeal = deal(10000, "2025-01-01");
    ancienDeal.deal.appliquerEvolutionFiscale = true;

    expect(calculerSyntheseDashboard([ancienDeal], new Date("2026-02-01")).rendementMoyenPondere).toBe(7.8);
  });

  it("génère une courbe cumulée et identifie la prochaine échéance", () => {
    const premier = deal(1000, "2025-01-01");
    premier.echeances = [
      { id: "past", dealId: premier.deal.id, date: new Date("2025-02-01"), montant: 10, encaissee: false },
      { id: "future", dealId: premier.deal.id, date: new Date("2025-08-01"), montant: 10, encaissee: false },
    ];

    const synthese = calculerSyntheseDashboard([premier], new Date("2025-06-01"));

    expect(synthese.prochaineEcheance?.id).toBe("future");
    expect(synthese.pointsCourbe.map((point) => point.valeur)).toEqual([1000, 1010, 1020]);
    expect(synthese.pointsCourbe.map((point) => point.projection)).toEqual([false, false, true]);
  });

  it("utilise les statuts d'encaissement quand le suivi est actif", () => {
    const premier = deal(1000, "2025-01-01");
    premier.echeances = [
      { id: "pointe", dealId: premier.deal.id, date: new Date("2025-02-01"), montant: 10, encaissee: true },
      { id: "a-pointer", dealId: premier.deal.id, date: new Date("2025-03-01"), montant: 10, encaissee: false },
    ];

    const synthese = calculerSyntheseDashboard([premier], new Date("2025-06-01"), {
      suiviEncaissements: true,
    });

    expect(synthese.interetsAcquis).toBe(10);
    expect(synthese.interetsFuturs).toBe(10);
    expect(synthese.prochaineEcheance?.id).toBe("a-pointer");
    expect(synthese.pointsCourbe.map((point) => point.projection)).toEqual([false, false, true]);
  });

  it("calcule le mini résumé financier d'un deal", () => {
    const premier = deal(10000, "2025-01-01");
    premier.echeances = [
      { id: "pointe", dealId: premier.deal.id, date: new Date("2025-02-01"), montant: 250, encaissee: true },
      { id: "future", dealId: premier.deal.id, date: new Date("2026-02-01"), montant: 250, encaissee: false },
    ];

    expect(calculerSyntheseDashboard([premier], new Date("2025-06-01"), { suiviEncaissements: true })).toMatchObject({
      totalInvesti: 10000,
      interetsAcquis: 250,
      interetsFuturs: 250,
      totalFinal: 10500,
    });
  });
});

describe("filtrerPointsCourbe", () => {
  it("conserve le dernier historique et les 12 prochains mois", () => {
    const points = [
      { date: new Date("2025-01-01"), valeur: 1000, projection: false },
      { date: new Date("2025-06-01"), valeur: 1100, projection: false },
      { date: new Date("2026-03-01"), valeur: 1200, projection: true },
      { date: new Date("2027-01-01"), valeur: 1300, projection: true },
    ];

    expect(filtrerPointsCourbe(points, "1a", new Date("2025-06-15")).map((point) => point.date.toISOString().slice(0, 10))).toEqual([
      "2025-06-01",
      "2026-03-01",
    ]);
    expect(filtrerPointsCourbe(points, "tout", new Date("2025-06-15"))).toEqual(points);
  });
});
