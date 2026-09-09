import { beforeEach, describe, expect, it, vi } from "vitest";
import { Echeance } from "../types";
import { echeancesDuJour, notifierEcheancesDuJour } from "./notifications";

const maintenant = new Date(2026, 8, 9, 10);

function creerEcheance(id: string, date: Date, encaissee = false): Echeance {
  return { id, dealId: "deal-1", date, montant: 250, encaissee };
}

describe("notifications d’échéances", () => {
  beforeEach(() => {
    const stockage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (cle: string) => stockage.get(cle) ?? null,
      setItem: (cle: string, valeur: string) => stockage.set(cle, valeur),
      removeItem: (cle: string) => stockage.delete(cle),
      clear: () => stockage.clear(),
    });
    vi.stubGlobal("Notification", class {
      static permission = "granted";
      static instances: Array<{ body?: string }> = [];
      onclick?: () => void;
      constructor(_title: string, options: { body?: string }) {
        (this.constructor as typeof Notification & { instances: Array<{ body?: string }> }).instances.push(options);
      }
      close() {}
    });
  });

  it("retient uniquement les échéances non encaissées du jour", () => {
    expect(echeancesDuJour([
      creerEcheance("du-jour", new Date(2026, 8, 9, 12)),
      creerEcheance("demain", new Date(2026, 8, 10, 12)),
      creerEcheance("encaissee", new Date(2026, 8, 9, 12), true),
    ], maintenant).map((echeance) => echeance.id)).toEqual(["du-jour"]);
  });

  it("n’envoie pas deux fois la notification d’une même échéance", () => {
    const echeance = creerEcheance("echeance-1", new Date(2026, 8, 9, 12));
    expect(notifierEcheancesDuJour([echeance], new Map([["deal-1", "Champs Elysées"]]), maintenant)).toBe(1);
    expect(notifierEcheancesDuJour([echeance], new Map([["deal-1", "Champs Elysées"]]), maintenant)).toBe(0);
  });
});
