import { describe, expect, it } from "vitest";
import { calculerSyntheseDashboard, DashboardDeal } from "./dashboard";

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
      { id: "past", dealId: premier.deal.id, date: new Date("2025-04-01"), montant: 200 },
      { id: "future", dealId: premier.deal.id, date: new Date("2026-04-01"), montant: 200 },
    ];

    expect(calculerSyntheseDashboard([premier], new Date("2025-06-01"))).toMatchObject({
      totalInvesti: 10000,
      interetsAcquis: 200,
      interetsFuturs: 200,
      totalActuel: 10200,
      totalFinal: 10400,
    });
  });

  it("génère une courbe cumulée et identifie la prochaine échéance", () => {
    const premier = deal(1000, "2025-01-01");
    premier.echeances = [
      { id: "past", dealId: premier.deal.id, date: new Date("2025-02-01"), montant: 10 },
      { id: "future", dealId: premier.deal.id, date: new Date("2025-08-01"), montant: 10 },
    ];

    const synthese = calculerSyntheseDashboard([premier], new Date("2025-06-01"));

    expect(synthese.prochaineEcheance?.id).toBe("future");
    expect(synthese.pointsCourbe.map((point) => point.valeur)).toEqual([1000, 1010, 1020]);
    expect(synthese.pointsCourbe.map((point) => point.projection)).toEqual([false, false, true]);
  });
});
