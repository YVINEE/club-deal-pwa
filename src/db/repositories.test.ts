import { beforeEach, describe, expect, it, vi } from "vitest";
import { Deal, Echeance, Prolongation } from "../types";

const stockage = vi.hoisted(() => ({
  data: { deals: [] as Deal[], prolongations: [] as Prolongation[], echeances: [] as Echeance[] },
}));

vi.mock("./secureStorage", () => ({
  lirePortefeuille: vi.fn(async () => stockage.data),
  enregistrerPortefeuille: vi.fn(async (data) => { stockage.data = data; }),
}));

import { modifierDeal, supprimerDeal } from "./repositories";

function deal(id: string, dateDebut: Date, reinvestissement?: Deal["reinvestissement"]): Deal {
  return {
    id,
    nom: id,
    dateDebut,
    montant: 10000,
    rendementAnnuel: 10,
    frequence: "trimestriel",
    dureeInitiale: 12,
    nombreMaxProlongations: 0,
    dureeProlongationMois: 0,
    reinvestissement,
  };
}

function portefeuilleAvecReinvestissement() {
  const dateSource = new Date();
  dateSource.setFullYear(dateSource.getFullYear() - 2);
  const dateDestination = new Date();
  dateDestination.setMonth(dateDestination.getMonth() + 1);
  const source = deal("source", dateSource);
  const destination = deal("destination", dateDestination, { sourceDealId: source.id, montant: 4000 });
  stockage.data = { deals: [source, destination], prolongations: [], echeances: [] };
  return { source, destination };
}

describe("repositories et réinvestissements", () => {
  beforeEach(() => {
    stockage.data = { deals: [], prolongations: [], echeances: [] };
  });

  it("refuse la suppression d'une source encore utilisée", async () => {
    const { source } = portefeuilleAvecReinvestissement();

    await expect(supprimerDeal(source.id)).rejects.toThrow("réinvestissements en dépendent");
    expect(stockage.data.deals).toHaveLength(2);
  });

  it("libère le capital après suppression du deal destination", async () => {
    const { source, destination } = portefeuilleAvecReinvestissement();

    await supprimerDeal(destination.id);

    expect(stockage.data.deals).toEqual([source]);
  });

  it("préserve le lien de réinvestissement lors d'une modification", async () => {
    const { destination } = portefeuilleAvecReinvestissement();

    await modifierDeal({ ...destination, nom: "destination modifiée" });

    expect(stockage.data.deals.find((deal) => deal.id === destination.id)?.reinvestissement).toEqual({
      sourceDealId: "source",
      montant: 4000,
    });
  });
});
