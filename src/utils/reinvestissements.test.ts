import { describe, expect, it } from "vitest";
import { Deal } from "../types";
import {
  calculerCapitalEngageNet,
  capitauxDisponibles,
  validerReinvestissements,
} from "./reinvestissements";

function deal(id: string, montant: number, dateDebut: Date, reinvestissement?: Deal["reinvestissement"]): Deal {
  return {
    id,
    nom: id,
    dateDebut,
    montant,
    rendementAnnuel: 10,
    frequence: "trimestriel",
    dureeInitiale: 12,
    nombreMaxProlongations: 0,
    dureeProlongationMois: 0,
    reinvestissement,
  };
}

function datesDealTermine() {
  const debut = new Date();
  debut.setFullYear(debut.getFullYear() - 2);
  const fin = new Date(debut);
  fin.setFullYear(fin.getFullYear() + 1);
  return { debut, fin };
}

describe("réinvestissements", () => {
  it("calcule la disponibilité et le capital engagé net", () => {
    const { debut, fin } = datesDealTermine();
    const source = deal("source", 10000, debut);
    const destination = deal("destination", 6000, new Date(fin), { sourceDealId: source.id, montant: 4000 });

    expect(capitauxDisponibles([source, destination]).get(source.id)).toBe(6000);
    expect(calculerCapitalEngageNet([source, destination])).toBe(12000);
    expect(capitauxDisponibles([source]).get(source.id)).toBe(10000);
  });

  it("valide les chaînes et refuse les dépassements de pool", () => {
    const { debut, fin } = datesDealTermine();
    const source = deal("source", 10000, debut);
    const destination = deal("destination", 6000, new Date(fin), { sourceDealId: source.id, montant: 4000 });
    const finDestination = new Date(fin);
    finDestination.setFullYear(finDestination.getFullYear() + 1);
    const suite = deal("suite", 3000, finDestination, { sourceDealId: destination.id, montant: 2000 });

    expect(() => validerReinvestissements([source, suite, destination], [])).not.toThrow();
    expect(() => validerReinvestissements([
      source,
      destination,
      { ...suite, reinvestissement: { sourceDealId: source.id, montant: 7000 } },
    ], [])).toThrow();
  });

  it("refuse une source active, une date trop tôt, une auto-référence et un cycle", () => {
    const actif = deal("actif", 10000, new Date());
    const autre = deal("autre", 5000, new Date(), { sourceDealId: actif.id, montant: 1000 });
    expect(() => validerReinvestissements([actif, autre], [])).toThrow("terminé");

    const { debut, fin } = datesDealTermine();
    const source = deal("source", 10000, debut);
    expect(() => validerReinvestissements([
      source,
      deal("trop-tot", 1000, new Date(fin.getTime() - 86400000), { sourceDealId: source.id, montant: 1000 }),
    ], [])).toThrow("commencer");
    expect(() => validerReinvestissements([
      source,
      deal(source.id, 1000, new Date(fin), { sourceDealId: source.id, montant: 1000 }),
    ], [])).toThrow();

    const cycleDate = new Date();
    cycleDate.setFullYear(cycleDate.getFullYear() - 2);
    const cycleA = { ...deal("cycle-a", 1000, cycleDate), dureeInitiale: 0 };
    const cycleB = { ...deal("cycle-b", 1000, cycleDate), dureeInitiale: 0 };
    cycleA.reinvestissement = { sourceDealId: cycleB.id, montant: 1 };
    cycleB.reinvestissement = { sourceDealId: cycleA.id, montant: 1 };
    expect(() => validerReinvestissements([cycleA, cycleB], [])).toThrow("Cycle");
  });

  it("refuse un montant supérieur au deal destination et accepte les centimes", () => {
    const { debut, fin } = datesDealTermine();
    const source = deal("source", 10000, debut);
    expect(() => validerReinvestissements([
      source,
      deal("destination", 1000, new Date(fin), { sourceDealId: source.id, montant: 1000.01 }),
    ], [])).toThrow();
    expect(() => validerReinvestissements([
      source,
      deal("destination", 0.3, new Date(fin), { sourceDealId: source.id, montant: 0.1 }),
    ], [])).not.toThrow();

    expect(() => validerReinvestissements([
      { ...source, montant: 3000 },
      deal("destination-reduit", 6000, new Date(fin), { sourceDealId: source.id, montant: 4000 }),
    ], [])).toThrow("capital disponible");

    expect(() => validerReinvestissements([
      source,
      deal("destination-total", 10000, new Date(fin), { sourceDealId: source.id, montant: 10000 }),
    ], [])).not.toThrow();
  });
});
