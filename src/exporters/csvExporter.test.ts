import { describe, expect, it } from "vitest";
import { Deal, Echeance } from "../types";
import { genererCsv } from "./csvExporter";

const deal: Deal = {
  id: "deal-1",
  nom: "Champs Elysées",
  dateDebut: new Date(2026, 0, 8, 12),
  montant: 10000,
  rendementAnnuel: 12,
  frequence: "trimestriel",
  dureeInitiale: 12,
  nombreMaxProlongations: 0,
  dureeProlongationMois: 0,
};

const echeances: Echeance[] = [
  { id: "echeance-1", dealId: deal.id, date: new Date(2026, 3, 8, 12), montant: 300, encaissee: false },
  { id: "echeance-2", dealId: deal.id, date: new Date(2026, 6, 8, 12), montant: 300, encaissee: true },
];

describe("genererCsv", () => {
  it("génère un CSV avec l'en-tête et toutes les échéances", () => {
    expect(genererCsv(deal, echeances)).toBe(
      [
        "Date;Montant;Type;Deal",
        "08 avril 2026;300.00;Interet;Champs Elysées",
        "08 juillet 2026;300.00;Interet;Champs Elysées",
      ].join("\n"),
    );
  });

  it("génère uniquement l'en-tête sans échéance", () => {
    expect(genererCsv(deal, [])).toBe("Date;Montant;Type;Deal");
  });

  it("échappe les séparateurs et neutralise les formules", () => {
    const csv = genererCsv({ ...deal, nom: '=HYPERLINK("https://exemple.test");Nom' }, [echeances[0]]);
    expect(csv).toContain(';"\'=HYPERLINK(""https://exemple.test"");Nom"');
  });
});
