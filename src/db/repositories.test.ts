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

  it("supprime une source réinvestie et convertit le réinvestissement en apport neuf", async () => {
    const { source, destination } = portefeuilleAvecReinvestissement();
    const echeance: Echeance = { id: "e1", dealId: destination.id, date: destination.dateDebut, montant: 250, encaissee: true };
    stockage.data.echeances = [echeance];

    await supprimerDeal(source.id);

    const apportNeuf = { ...destination };
    delete apportNeuf.reinvestissement;
    expect(stockage.data.deals).toEqual([apportNeuf]);
    expect(stockage.data.deals[0]).not.toHaveProperty("reinvestissement");
    expect(stockage.data.echeances).toEqual([echeance]);
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

  it("permet d'ajouter puis de retirer un réinvestissement en modification", async () => {
    const dateSource = new Date();
    dateSource.setFullYear(dateSource.getFullYear() - 2);
    const dateDestination = new Date();
    dateDestination.setMonth(dateDestination.getMonth() + 1);
    const source = deal("source", dateSource);
    const destination = deal("destination", dateDestination);
    stockage.data = { deals: [source, destination], prolongations: [], echeances: [] };

    await modifierDeal({
      ...destination,
      reinvestissement: { sourceDealId: source.id, montant: 4000 },
    });
    expect(stockage.data.deals.find((deal) => deal.id === destination.id)?.reinvestissement).toEqual({
      sourceDealId: source.id,
      montant: 4000,
    });

    await modifierDeal({ ...destination, reinvestissement: undefined });
    expect(stockage.data.deals.find((deal) => deal.id === destination.id)?.reinvestissement).toBeUndefined();
  });
});
