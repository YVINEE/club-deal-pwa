import { Deal, Echeance, Prolongation } from "../types";
import { genererEcheances, creerProlongation } from "../utils/calculs";
import { dateFinCourante } from "../utils/statusUtils";
import { enregistrerPortefeuille, lirePortefeuille } from "./secureStorage";

async function recalculerEcheances(dealId: string): Promise<void> {
  const data = await lirePortefeuille();
  const deal = data.deals.find((candidate) => candidate.id === dealId);
  if (!deal) return;

  const prolongations = data.prolongations.filter((prolongation) => prolongation.dealId === dealId);
  const anciennesEcheances = data.echeances.filter((echeance) => echeance.dealId === dealId);
  const echeances = genererEcheances(deal, prolongations);
  const encaissements = new Map(
    anciennesEcheances.map((echeance) => [echeance.date.getTime(), echeance])
  );
  echeances.forEach((echeance) => {
    const ancienne = encaissements.get(echeance.date.getTime());
    if (!ancienne) return;
    echeance.encaissee = ancienne.encaissee;
    if (ancienne.encaissee) echeance.montant = ancienne.montant;
  });

  data.echeances = [...data.echeances.filter((echeance) => echeance.dealId !== dealId), ...echeances];
  await enregistrerPortefeuille(data);
}

export async function ajouterDeal(deal: Deal): Promise<void> {
  const data = await lirePortefeuille();
  data.deals.push(deal);
  await enregistrerPortefeuille(data);
  await recalculerEcheances(deal.id);
}

export async function modifierDeal(deal: Deal): Promise<void> {
  const data = await lirePortefeuille();
  data.deals = data.deals.map((candidate) => (candidate.id === deal.id ? deal : candidate));
  await enregistrerPortefeuille(data);
  await recalculerEcheances(deal.id);
}

export async function supprimerDeal(dealId: string): Promise<void> {
  const data = await lirePortefeuille();
  data.deals = data.deals.filter((deal) => deal.id !== dealId);
  data.prolongations = data.prolongations.filter((prolongation) => prolongation.dealId !== dealId);
  data.echeances = data.echeances.filter((echeance) => echeance.dealId !== dealId);
  await enregistrerPortefeuille(data);
}

export async function prolongerDeal(dealId: string): Promise<void> {
  const data = await lirePortefeuille();
  const deal = data.deals.find((candidate) => candidate.id === dealId);
  if (!deal) throw new Error(`Deal ${dealId} introuvable`);

  const prolongationsExistantes = data.prolongations.filter((prolongation) => prolongation.dealId === dealId);
  if (new Date() >= dateFinCourante(deal, prolongationsExistantes)) {
    throw new Error(`Le deal "${deal.nom}" est arrivé à échéance`);
  }
  const nouvelleProlongation: Prolongation = creerProlongation(deal, prolongationsExistantes);

  data.prolongations.push(nouvelleProlongation);
  await enregistrerPortefeuille(data);
  await recalculerEcheances(dealId);
}

export async function annulerDerniereProlongation(dealId: string): Promise<void> {
  const data = await lirePortefeuille();
  const prolongations = data.prolongations.filter((prolongation) => prolongation.dealId === dealId);
  if (prolongations.length === 0) throw new Error("Aucune prolongation à annuler");

  const derniere = [...prolongations].sort((a, b) => b.ordre - a.ordre)[0];
  data.prolongations = data.prolongations.filter((prolongation) => prolongation.id !== derniere.id);
  await enregistrerPortefeuille(data);
  await recalculerEcheances(dealId);
}

export async function marquerEcheanceEncaissee(echeanceId: string): Promise<void> {
  const data = await lirePortefeuille();
  const echeance = data.echeances.find((candidate) => candidate.id === echeanceId);
  if (!echeance) throw new Error("Échéance introuvable");
  if (echeance.date > new Date()) throw new Error("Cette échéance n'est pas encore échue");
  echeance.encaissee = true;
  await enregistrerPortefeuille(data);
}

export async function annulerEcheanceEncaissee(echeanceId: string): Promise<void> {
  const data = await lirePortefeuille();
  const echeance = data.echeances.find((candidate) => candidate.id === echeanceId);
  if (!echeance) throw new Error("Échéance introuvable");
  echeance.encaissee = false;
  await enregistrerPortefeuille(data);
}

export async function getDealsAvecEcheances(): Promise<Array<{
  deal: Deal;
  prolongations: Prolongation[];
  echeances: Echeance[];
}>> {
  const data = await lirePortefeuille();
  return data.deals.map((deal) => ({
      deal,
      prolongations: data.prolongations
        .filter((prolongation) => prolongation.dealId === deal.id)
        .sort((a, b) => a.ordre - b.ordre),
      echeances: data.echeances
        .filter((echeance) => echeance.dealId === deal.id)
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    }));
}
