import { describe, expect, it } from "vitest";
import { addMonths, formatDateCourteFr, formatDateFr, formatDateInput, frequenceEnMois, parseDateInput } from "./dateUtils";

function date(annee: number, mois: number, jour: number): Date {
  return new Date(annee, mois - 1, jour, 12);
}

describe("formatage des dates", () => {
  it("construit une date de formulaire en heure locale", () => {
    const valeur = parseDateInput("2026-01-01");
    expect(formatDateInput(valeur)).toBe("2026-01-01");
    expect(valeur.getDate()).toBe(1);
  });
  it("formate une date en français avec le mois complet", () => {
    expect(formatDateFr(date(2026, 10, 8))).toBe("08 octobre 2026");
  });

  it("formate une date en français avec le mois abrégé", () => {
    expect(formatDateCourteFr(date(2026, 10, 8))).toBe("08 oct. 2026");
  });
});

describe("addMonths", () => {
  it("ajoute le nombre de mois demandé", () => {
    expect(addMonths(date(2026, 1, 15), 3)).toEqual(date(2026, 4, 15));
  });
});

describe("frequenceEnMois", () => {
  it("retourne 3 mois pour une fréquence trimestrielle", () => {
    expect(frequenceEnMois("trimestriel")).toBe(3);
  });

  it("retourne 6 mois pour une fréquence semestrielle", () => {
    expect(frequenceEnMois("semestriel")).toBe(6);
  });
});
