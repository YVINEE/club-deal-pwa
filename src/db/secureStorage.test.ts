import { describe, expect, it } from "vitest";
import { PortfolioData, validerDonnees } from "./secureStorage";

const donneesValides: PortfolioData = {
  deals: [{
    id: "deal-1",
    nom: "Deal test",
    dateDebut: new Date(2025, 0, 1, 12),
    montant: 10000,
    rendementAnnuel: 10,
    frequence: "trimestriel",
    dureeInitiale: 24,
    nombreMaxProlongations: 1,
    dureeProlongationMois: 6,
  }],
  prolongations: [],
  echeances: [{ id: "echeance-1", dealId: "deal-1", date: new Date(2025, 3, 1, 12), montant: 250, encaissee: false }],
};

describe("validation des imports", () => {
  it("accepte un portefeuille valide", () => {
    expect(() => validerDonnees(donneesValides)).not.toThrow();
  });

  it("rejette une fréquence inconnue et les identifiants dupliqués", () => {
    expect(() => validerDonnees({ ...donneesValides, deals: [{ ...donneesValides.deals[0], frequence: "mensuel" as never }] })).toThrow();
    expect(() => validerDonnees({ ...donneesValides, echeances: [donneesValides.echeances[0], { ...donneesValides.echeances[0] }] })).toThrow();
  });

  it("rejette les durées excessives", () => {
    expect(() => validerDonnees({ ...donneesValides, deals: [{ ...donneesValides.deals[0], dureeInitiale: 1201 }] })).toThrow();
  });

  it("tolère une ancienne durée hors des nouvelles bornes au déverrouillage", () => {
    expect(() => validerDonnees({ ...donneesValides, deals: [{ ...donneesValides.deals[0], dureeInitiale: 1201 }] }, { strict: false })).not.toThrow();
  });
});
