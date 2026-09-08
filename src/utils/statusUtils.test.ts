import { describe, expect, it } from "vitest";
import { Deal, Prolongation } from "../types";
import { calculerStatut, dateFinCourante, peutProlonger } from "./statusUtils";

function date(annee: number, mois: number, jour: number): Date {
  return new Date(annee, mois - 1, jour, 12);
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

describe("dateFinCourante", () => {
  it("retourne la fin de la durée initiale sans prolongation", () => {
    expect(dateFinCourante(creerDeal(), [])).toEqual(date(2025, 1, 15));
  });

  it("retourne la fin de la prolongation au plus grand ordre", () => {
    const prolongations: Prolongation[] = [
      {
        id: "prolongation-2",
        dealId: "deal-1",
        dateDebut: date(2025, 7, 15),
        dateFin: date(2026, 1, 15),
        ordre: 2,
      },
      {
        id: "prolongation-1",
        dealId: "deal-1",
        dateDebut: date(2025, 1, 15),
        dateFin: date(2025, 7, 15),
        ordre: 1,
      },
    ];

    expect(dateFinCourante(creerDeal(), prolongations)).toEqual(date(2026, 1, 15));
  });
});

describe("calculerStatut", () => {
  it("retourne actif avant la fin initiale", () => {
    expect(calculerStatut(creerDeal(), [], date(2024, 6, 15))).toBe("actif");
  });

  it("retourne termine à la date de fin", () => {
    expect(calculerStatut(creerDeal(), [], date(2025, 1, 15))).toBe("termine");
  });

  it("retourne enProlongation pendant une prolongation", () => {
    const prolongation: Prolongation = {
      id: "prolongation-1",
      dealId: "deal-1",
      dateDebut: date(2025, 1, 15),
      dateFin: date(2025, 7, 15),
      ordre: 1,
    };

    expect(calculerStatut(creerDeal(), [prolongation], date(2025, 4, 15))).toBe("enProlongation");
  });
});

describe("peutProlonger", () => {
  it("autorise une prolongation sous la limite", () => {
    expect(peutProlonger(creerDeal({ nombreMaxProlongations: 2 }), [{} as Prolongation])).toBe(true);
  });

  it("refuse une prolongation à la limite", () => {
    expect(
      peutProlonger(creerDeal({ nombreMaxProlongations: 1 }), [{} as Prolongation])
    ).toBe(false);
  });
});
