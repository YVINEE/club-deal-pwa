import { describe, expect, it } from "vitest";
import { Deal, Prolongation } from "../types";
import {
  calculerCouponEstime,
  calculerCouponPourDate,
  calculerTauxNetEffectif,
  calculMontantInteret,
  creerProlongation,
  genererEcheances,
} from "./calculs";

function date(annee: number, mois: number, jour: number): Date {
  return new Date(annee, mois - 1, jour, 12);
}

function cleDate(valeur: Date): string {
  return `${valeur.getFullYear()}-${String(valeur.getMonth() + 1).padStart(2, "0")}-${String(valeur.getDate()).padStart(2, "0")}`;
}

function creerDeal(surcharges: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    nom: "Deal test",
    dateDebut: date(2024, 1, 15),
    montant: 10000,
    rendementAnnuel: 12,
    frequence: "trimestriel",
    dureeInitiale: 12,
    nombreMaxProlongations: 2,
    dureeProlongationMois: 6,
    ...surcharges,
  };
}

describe("calculMontantInteret", () => {
  it("calcule les intérêts trimestriels", () => {
    expect(calculMontantInteret(creerDeal())).toBe(300);
  });

  it("calcule les intérêts semestriels", () => {
    expect(calculMontantInteret(creerDeal({ frequence: "semestriel" }))).toBe(600);
  });
});

describe("calculerCouponEstime", () => {
  it("calcule le coupon à partir des valeurs du formulaire", () => {
    expect(calculerCouponEstime(10000, 10, "trimestriel")).toBe(250);
    expect(calculerCouponEstime(10000, 10, "semestriel")).toBe(500);
  });
});

describe("fiscalité des coupons", () => {
  it("conserve le taux net avant le 1er janvier 2026", () => {
    expect(calculerTauxNetEffectif(10, date(2025, 1, 1), date(2025, 10, 1))).toBe(10);
    expect(calculerCouponPourDate(10000, 10, "trimestriel", date(2025, 1, 1), date(2025, 10, 1))).toBe(250);
  });

  it("ajuste le taux net à partir du 1er janvier 2026", () => {
    expect(calculerTauxNetEffectif(10, date(2025, 1, 1), date(2026, 1, 1))).toBeCloseTo(9.8);
    expect(calculerCouponPourDate(10000, 10, "trimestriel", date(2025, 1, 1), date(2026, 1, 1))).toBeCloseTo(245);
  });

  it("ne modifie pas un deal commencé à partir de 2026", () => {
    expect(calculerTauxNetEffectif(10, date(2026, 1, 1), date(2026, 4, 1))).toBe(10);
    expect(calculerCouponPourDate(10000, 10, "semestriel", date(2026, 1, 1), date(2026, 7, 1))).toBe(500);
  });
});

describe("genererEcheances", () => {
  it("génère les échéances de la période initiale", () => {
    const echeances = genererEcheances(creerDeal(), []);

    expect(echeances).toHaveLength(4);
    expect(echeances.map((echeance) => cleDate(echeance.date))).toEqual([
      "2024-04-15",
      "2024-07-15",
      "2024-10-15",
      "2025-01-15",
    ]);
    expect(echeances.every((echeance) => echeance.dealId === "deal-1")).toBe(true);
    expect(echeances.every((echeance) => echeance.montant === 300)).toBe(true);
  });

  it("génère les échéances des prolongations dans l'ordre", () => {
    const prolongation1: Prolongation = {
      id: "prolongation-1",
      dealId: "deal-1",
      dateDebut: date(2025, 1, 15),
      dateFin: date(2025, 7, 15),
      ordre: 1,
    };
    const prolongation2: Prolongation = {
      id: "prolongation-2",
      dealId: "deal-1",
      dateDebut: date(2025, 7, 15),
      dateFin: date(2026, 1, 15),
      ordre: 2,
    };

    const echeances = genererEcheances(creerDeal(), [prolongation2, prolongation1]);

    expect(echeances).toHaveLength(8);
    expect(echeances.slice(4).map((echeance) => cleDate(echeance.date))).toEqual([
      "2025-04-15",
      "2025-07-15",
      "2025-10-15",
      "2026-01-15",
    ]);
  });
});

describe("creerProlongation", () => {
  it("crée la prolongation suivante à partir de la fin courante", () => {
    const deal = creerDeal();
    const prolongations: Prolongation[] = [
      {
        id: "prolongation-1",
        dealId: deal.id,
        dateDebut: date(2025, 1, 15),
        dateFin: date(2025, 7, 15),
        ordre: 1,
      },
    ];

    const prolongation = creerProlongation(deal, prolongations);

    expect(prolongation.dealId).toBe(deal.id);
    expect(prolongation.ordre).toBe(2);
    expect(cleDate(prolongation.dateDebut)).toBe("2025-07-15");
    expect(cleDate(prolongation.dateFin)).toBe("2026-01-15");
  });

  it("refuse une prolongation lorsque la limite est atteinte", () => {
    const deal = creerDeal({ nombreMaxProlongations: 1 });
    const prolongation: Prolongation = {
      id: "prolongation-1",
      dealId: deal.id,
      dateDebut: date(2025, 1, 15),
      dateFin: date(2025, 7, 15),
      ordre: 1,
    };

    expect(() => creerProlongation(deal, [prolongation])).toThrow("a atteint son nombre maximum");
  });
});
