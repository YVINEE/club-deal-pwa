import { db, EncryptedVault } from "./database";
import { Deal, Echeance, Prolongation } from "../types";
import {
  Chiffrement,
  chiffrerAvecCle,
  chiffrerTexte,
  dechiffrerTexte,
  motDePasseValide,
} from "../utils/crypto";
import { calculerCouponPourDate, MAX_DUREE_MOIS } from "../utils/calculs";

const MODE_KEY = "club-deal-storage-mode";
const VAULT_ID = "current";

export type StorageMode = "plain" | "encrypted";

export interface PortfolioData {
  deals: Deal[];
  prolongations: Prolongation[];
  echeances: Echeance[];
}

interface JsonExportClair {
  format: "club-deal-pwa";
  version: 1;
  exportedAt: string;
  encrypted: false;
  data: PortfolioData;
}

interface JsonExportChiffre {
  format: "club-deal-pwa";
  version: 1;
  exportedAt: string;
  encrypted: true;
  encryption: Chiffrement;
}

type Session = {
  mode: StorageMode;
  data: PortfolioData;
  cle?: CryptoKey;
  chiffrement?: EncryptedVault;
};

let session: Session | null = null;

export function getStorageMode(): StorageMode {
  return localStorage.getItem(MODE_KEY) === "encrypted" ? "encrypted" : "plain";
}

function setStorageMode(mode: StorageMode): void {
  localStorage.setItem(MODE_KEY, mode);
}

async function lireTablesClaires(): Promise<PortfolioData> {
  return {
    deals: await db.deals.toArray(),
    prolongations: await db.prolongations.toArray(),
    echeances: await db.echeances.toArray(),
  };
}

async function ecrireTablesClaires(data: PortfolioData): Promise<void> {
  await db.transaction("rw", db.deals, db.prolongations, db.echeances, async () => {
    await db.deals.clear();
    await db.prolongations.clear();
    await db.echeances.clear();
    await db.deals.bulkAdd(data.deals);
    await db.prolongations.bulkAdd(data.prolongations);
    await db.echeances.bulkAdd(data.echeances);
  });
}

function normaliserMontantsEcheances(data: PortfolioData): PortfolioData {
  const deals = new Map(data.deals.map((deal) => [deal.id, deal]));
  let modifie = false;
  const echeances = data.echeances.map((echeance) => {
    const deal = deals.get(echeance.dealId);
    if (!deal || echeance.encaissee) return echeance;
    const montant = calculerCouponPourDate(
      deal.montant,
      deal.rendementAnnuel,
      deal.frequence,
      deal.dateDebut,
      echeance.date,
      deal.appliquerEvolutionFiscale === true,
      deal.montantCouponApresEvolutionFiscale,
    );
    if (Math.abs(montant - echeance.montant) < 0.000001) return echeance;
    modifie = true;
    return { ...echeance, montant };
  });
  return modifie ? { ...data, echeances } : data;
}

async function effacerTablesClaires(): Promise<void> {
  await db.transaction("rw", db.deals, db.prolongations, db.echeances, async () => {
    await db.deals.clear();
    await db.prolongations.clear();
    await db.echeances.clear();
  });
}

function serialiser(data: PortfolioData): string {
  return JSON.stringify(data);
}

function deserialiser(texte: string, strict = true): PortfolioData {
  const brut = JSON.parse(texte) as {
    deals?: Array<Record<string, unknown>>;
    prolongations?: Array<Record<string, unknown>>;
    echeances?: Array<Record<string, unknown>>;
  };

  if (!Array.isArray(brut.deals) || !Array.isArray(brut.prolongations) || !Array.isArray(brut.echeances)) {
    throw new Error("Données de portefeuille invalides");
  }

  const data: PortfolioData = {
    deals: brut.deals.map((deal) => ({
      ...deal,
      dateDebut: lireDate(String(deal.dateDebut)),
    })) as unknown as Deal[],
    prolongations: brut.prolongations.map((prolongation) => ({
      ...prolongation,
      dateDebut: lireDate(String(prolongation.dateDebut)),
      dateFin: lireDate(String(prolongation.dateFin)),
    })) as unknown as Prolongation[],
    echeances: brut.echeances.map((echeance) => ({
      ...echeance,
      date: lireDate(String(echeance.date)),
      encaissee: echeance.encaissee === true,
    })) as unknown as Echeance[],
  };

  validerDonnees(data, { strict });
  return data;
}

function lireDate(valeur: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valeur)) {
    const [annee, mois, jour] = valeur.split("-").map(Number);
    return new Date(annee, mois - 1, jour, 12);
  }
  return new Date(valeur);
}

export function validerDonnees(data: PortfolioData, options: { strict?: boolean } = {}): void {
  const strict = options.strict !== false;
  const idsUniques = (ids: string[]) => ids.every((id, index) => id.length > 0 && ids.indexOf(id) === index);
  const dateValide = (date: Date) => date instanceof Date && !Number.isNaN(date.getTime());
  const dealIds = new Set(data.deals.map((deal) => deal.id));
  const frequenceValide = (frequence: unknown) => frequence === "trimestriel" || frequence === "semestriel";

  if (!idsUniques(data.deals.map((deal) => deal.id)) || !idsUniques(data.prolongations.map((item) => item.id)) || !idsUniques(data.echeances.map((item) => item.id))) {
    throw new Error("Les identifiants du portefeuille doivent être uniques");
  }
  if (data.deals.some((deal) =>
    typeof deal.id !== "string" || typeof deal.nom !== "string" || deal.nom.length === 0 || deal.nom.length > 200 ||
    !dateValide(deal.dateDebut) || !Number.isFinite(deal.montant) || deal.montant <= 0 ||
    !Number.isFinite(deal.rendementAnnuel) || deal.rendementAnnuel <= 0 ||
    !frequenceValide(deal.frequence) || !Number.isFinite(deal.dureeInitiale) || deal.dureeInitiale <= 0 || (strict && (!Number.isInteger(deal.dureeInitiale) || deal.dureeInitiale > MAX_DUREE_MOIS)) ||
    !Number.isFinite(deal.nombreMaxProlongations) || deal.nombreMaxProlongations < 0 || (strict && (!Number.isInteger(deal.nombreMaxProlongations) || deal.nombreMaxProlongations > 20)) ||
    !Number.isFinite(deal.dureeProlongationMois) || deal.dureeProlongationMois < 0 || (strict && (!Number.isInteger(deal.dureeProlongationMois) || deal.dureeProlongationMois > MAX_DUREE_MOIS)) ||
    (strict && deal.nombreMaxProlongations > 0 && deal.dureeProlongationMois < (deal.frequence === "trimestriel" ? 3 : 6)) ||
    (deal.appliquerEvolutionFiscale !== undefined && typeof deal.appliquerEvolutionFiscale !== "boolean") ||
    (deal.montantCouponApresEvolutionFiscale !== undefined && (!Number.isFinite(deal.montantCouponApresEvolutionFiscale) || deal.montantCouponApresEvolutionFiscale < 0))
  )) {
    throw new Error("Données de deal invalides");
  }
  if (data.prolongations.some((item) =>
    !dealIds.has(item.dealId) || !dateValide(item.dateDebut) || !dateValide(item.dateFin) ||
    !Number.isInteger(item.ordre) || item.ordre <= 0
  )) {
    throw new Error("Données de prolongation invalides");
  }
  if (data.echeances.some((item) =>
    !dealIds.has(item.dealId) || !dateValide(item.date) || !Number.isFinite(item.montant) || item.montant < 0 || typeof item.encaissee !== "boolean"
  )) {
    throw new Error("Données d'échéance invalides");
  }
}

export async function ouvrirStockage(mode: StorageMode): Promise<void> {
  if (mode === "plain") {
    const donneesExistantes = await lireTablesClaires();
    const data = normaliserMontantsEcheances(donneesExistantes);
    if (data !== donneesExistantes) await ecrireTablesClaires(data);
    session = { mode, data };
  }
}

export function verrouillerStockage(): void {
  if (session?.mode === "encrypted") session = null;
}

export async function deverrouillerStockage(motDePasse: string): Promise<void> {
  if (!motDePasse) throw new Error("Mot de passe requis");
  const vault = await db.vault.get(VAULT_ID);
  if (!vault) throw new Error("Coffre chiffré introuvable");
  const { texte, cle } = await dechiffrerTexte(vault, motDePasse);
  const donneesExistantes = deserialiser(texte, false);
  const data = normaliserMontantsEcheances(donneesExistantes);
  session = { mode: "encrypted", data, cle, chiffrement: vault };
  if (data !== donneesExistantes) await enregistrerPortefeuille(data);
}

export async function lirePortefeuille(): Promise<PortfolioData> {
  if (!session && getStorageMode() === "plain") await ouvrirStockage("plain");
  if (!session) throw new Error("Le stockage local est verrouillé");
  return session.data;
}

export async function enregistrerPortefeuille(data: PortfolioData): Promise<void> {
  if (!session && getStorageMode() === "plain") await ouvrirStockage("plain");
  if (!session) throw new Error("Le stockage local est verrouillé");

  if (session.mode === "plain") {
    await ecrireTablesClaires(data);
  } else {
    if (!session.cle || !session.chiffrement) throw new Error("Clé de chiffrement indisponible");
    const chiffrement = await chiffrerAvecCle(
      serialiser(data),
      session.cle,
      session.chiffrement.salt,
      session.chiffrement.iterations,
    );
    const vault: EncryptedVault = { id: VAULT_ID, formatVersion: 1, ...chiffrement };
    await db.vault.put(vault);
    await effacerTablesClaires();
    session.chiffrement = vault;
  }
  session.data = data;
}

async function creerVault(data: PortfolioData, motDePasse: string): Promise<{ vault: EncryptedVault; cle: CryptoKey }> {
  if (!motDePasseValide(motDePasse)) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères");
  }
  const { chiffrement, cle } = await chiffrerTexte(serialiser(data), motDePasse);
  return { vault: { id: VAULT_ID, formatVersion: 1, ...chiffrement }, cle };
}

export async function activerChiffrement(motDePasse: string): Promise<void> {
  if (!session || session.mode !== "plain") throw new Error("La base n'est pas en mode clair");
  const { vault, cle } = await creerVault(session.data, motDePasse);
  await db.vault.put(vault);
  await effacerTablesClaires();
  session = { mode: "encrypted", data: session.data, cle, chiffrement: vault };
  setStorageMode("encrypted");
}

export async function desactiverChiffrement(motDePasse: string): Promise<void> {
  if (!session || session.mode !== "encrypted") throw new Error("La base n'est pas chiffrée");
  await deverrouillerStockage(motDePasse);
  if (!session) throw new Error("Impossible de déverrouiller le coffre");
  await ecrireTablesClaires(session.data);
  await db.vault.delete(VAULT_ID);
  session = { mode: "plain", data: session.data };
  setStorageMode("plain");
}

export async function changerMotDePasseChiffrement(ancien: string, nouveau: string): Promise<void> {
  if (!session || session.mode !== "encrypted") throw new Error("La base n'est pas chiffrée");
  await deverrouillerStockage(ancien);
  if (!session) throw new Error("Impossible de déverrouiller le coffre");
  const { vault, cle } = await creerVault(session.data, nouveau);
  await db.vault.put(vault);
  session = { mode: "encrypted", data: session.data, cle, chiffrement: vault };
}

export async function exporterJson(): Promise<string> {
  if (!session) throw new Error("Le stockage local est verrouillé");

  if (session.mode === "plain") {
    const exportClair: JsonExportClair = {
      format: "club-deal-pwa",
      version: 1,
      exportedAt: new Date().toISOString(),
      encrypted: false,
      data: session.data,
    };
    return JSON.stringify(exportClair, null, 2);
  }

  if (!session.cle || !session.chiffrement) throw new Error("Clé de chiffrement indisponible");
  const encryption = await chiffrerAvecCle(
    serialiser(session.data),
    session.cle,
    session.chiffrement.salt,
    session.chiffrement.iterations,
  );
  const exportChiffre: JsonExportChiffre = {
    format: "club-deal-pwa",
    version: 1,
    exportedAt: new Date().toISOString(),
    encrypted: true,
    encryption,
  };
  return JSON.stringify(exportChiffre, null, 2);
}

export async function importerJson(texte: string, motDePasse?: string): Promise<void> {
  if (!session) throw new Error("Le stockage local est verrouillé");
  const contenu = JSON.parse(texte) as JsonExportClair | JsonExportChiffre;
  if (contenu.format !== "club-deal-pwa" || contenu.version !== 1) {
    throw new Error("Format JSON non reconnu");
  }

  let data: PortfolioData;
  if (contenu.encrypted) {
    if (!motDePasse) throw new Error("Mot de passe requis pour cet export");
    data = deserialiser((await dechiffrerTexte(contenu.encryption, motDePasse)).texte);
  } else {
    data = deserialiser(JSON.stringify(contenu.data));
  }

  if (session.mode === "plain") {
    await ecrireTablesClaires(data);
  } else {
    if (!session.cle || !session.chiffrement) throw new Error("Clé de chiffrement indisponible");
    const chiffrement = await chiffrerAvecCle(
      serialiser(data),
      session.cle,
      session.chiffrement.salt,
      session.chiffrement.iterations,
    );
    const vault: EncryptedVault = { id: VAULT_ID, formatVersion: 1, ...chiffrement };
    await db.vault.put(vault);
    await effacerTablesClaires();
    session.chiffrement = vault;
  }
  session.data = data;
}
