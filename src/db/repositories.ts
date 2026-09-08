import { db } from "./database";
import { Deal, Prolongation } from "../types";
import { genererEcheances, creerProlongation } from "../utils/calculs";

async function recalculerEcheances(dealId: string): Promise<void> {
  const deal = await db.deals.get(dealId);
  if (!deal) return;

  const prolongations = await db.prolongations.where("dealId").equals(dealId).toArray();
  const echeances = genererEcheances(deal, prolongations);

  await db.transaction("rw", db.echeances, async () => {
    await db.echeances.where("dealId").equals(dealId).delete();
    await db.echeances.bulkAdd(echeances);
  });
}

export async function ajouterDeal(deal: Deal): Promise<void> {
  await db.deals.add(deal);
  await recalculerEcheances(deal.id);
}

export async function modifierDeal(deal: Deal): Promise<void> {
  await db.deals.put(deal);
  await recalculerEcheances(deal.id);
}

export async function supprimerDeal(dealId: string): Promise<void> {
  await db.transaction("rw", db.deals, db.prolongations, db.echeances, async () => {
    await db.deals.delete(dealId);
    await db.prolongations.where("dealId").equals(dealId).delete();
    await db.echeances.where("dealId").equals(dealId).delete();
  });
}

export async function prolongerDeal(dealId: string): Promise<void> {
  const deal = await db.deals.get(dealId);
  if (!deal) throw new Error(`Deal ${dealId} introuvable`);

  const prolongationsExistantes = await db.prolongations.where("dealId").equals(dealId).toArray();
  const nouvelleProlongation: Prolongation = creerProlongation(deal, prolongationsExistantes);

  await db.prolongations.add(nouvelleProlongation);
  await recalculerEcheances(dealId);
}

export async function getDealsAvecEcheances() {
  const deals = await db.deals.toArray();
  return Promise.all(
    deals.map(async (deal) => ({
      deal,
      prolongations: await db.prolongations.where("dealId").equals(deal.id).toArray(),
      echeances: await db.echeances.where("dealId").equals(deal.id).sortBy("date"),
    }))
  );
}
