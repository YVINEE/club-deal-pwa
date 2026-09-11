import { Deal, Prolongation } from "../types";
import { dateFinCourante } from "./statusUtils";

const EPSILON_CENTIMES = 0.000001;

export function arrondirCentimes(montant: number): number {
  return Math.round((montant + Number.EPSILON) * 100) / 100;
}

export function montantsReinvestisParSource(deals: Deal[]): Map<string, number> {
  const montants = new Map<string, number>();
  for (const deal of deals) {
    const reinvestissement = deal.reinvestissement;
    if (!reinvestissement) continue;
    montants.set(
      reinvestissement.sourceDealId,
      arrondirCentimes((montants.get(reinvestissement.sourceDealId) ?? 0) + reinvestissement.montant),
    );
  }
  return montants;
}

export function capitauxDisponibles(deals: Deal[]): Map<string, number> {
  const reinvestis = montantsReinvestisParSource(deals);
  return new Map(deals.map((deal) => [
    deal.id,
    Math.max(0, arrondirCentimes(deal.montant - (reinvestis.get(deal.id) ?? 0))),
  ]));
}

export function calculerCapitalEngageNet(deals: Deal[]): number {
  return arrondirCentimes(
    deals.reduce((total, deal) => total + deal.montant - (deal.reinvestissement?.montant ?? 0), 0),
  );
}

export function validerReinvestissements(
  deals: Deal[],
  prolongations: Prolongation[],
  maintenant: Date = new Date(),
): void {
  const dealsParId = new Map(deals.map((deal) => [deal.id, deal]));
  const reinvestis = montantsReinvestisParSource(deals);
  const sourceParDestination = new Map<string, string>();

  for (const deal of deals) {
    const reinvestissement = deal.reinvestissement;
    if (!reinvestissement) continue;

    if (
      typeof reinvestissement.sourceDealId !== "string" ||
      !reinvestissement.sourceDealId ||
      !Number.isFinite(reinvestissement.montant) ||
      reinvestissement.montant <= 0
    ) {
      throw new Error("Réinvestissement invalide");
    }

    const source = dealsParId.get(reinvestissement.sourceDealId);
    if (!source || source.id === deal.id) throw new Error("Deal source de réinvestissement invalide");

    const dateFinSource = dateFinCourante(
      source,
      prolongations.filter((prolongation) => prolongation.dealId === source.id),
    );
    if (maintenant < dateFinSource) throw new Error("Le deal source doit être terminé");
    if (deal.dateDebut < dateFinSource) throw new Error("Le nouveau deal doit commencer après la fin du deal source");
    if (reinvestissement.montant > deal.montant + EPSILON_CENTIMES) {
      throw new Error("Le montant réinvesti dépasse le montant du nouveau deal");
    }
    sourceParDestination.set(deal.id, source.id);
  }

  for (const [sourceId, montant] of reinvestis) {
    const source = dealsParId.get(sourceId);
    if (!source || montant > source.montant + EPSILON_CENTIMES) {
      throw new Error("Le capital réinvesti dépasse le capital disponible du deal source");
    }
  }

  for (const deal of deals) {
    const visites = new Set<string>();
    let courant: string | undefined = deal.id;
    while (courant) {
      if (visites.has(courant)) throw new Error("Cycle de réinvestissement détecté");
      visites.add(courant);
      courant = sourceParDestination.get(courant);
    }
  }

  if (calculerCapitalEngageNet(deals) < -EPSILON_CENTIMES) {
    throw new Error("Le capital engagé net ne peut pas être négatif");
  }
}
