import { db, EncryptedVault } from "./database";
import { Deal, Echeance, Prolongation } from "../types";
import {
  Chiffrement,
  chiffrerAvecCle,
  chiffrerTexte,
  dechiffrerAvecCle,
  dechiffrerTexte,
  motDePasseValide,
} from "../utils/crypto";
import { calculerCouponPourDate } from "../utils/calculs";

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

function deserialiser(texte: string): PortfolioData {
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
      dateDebut: new Date(String(deal.dateDebut)),
    })) as unknown as Deal[],
    prolongations: brut.prolongations.map((prolongation) => ({
      ...prolongation,
      dateDebut: new Date(String(prolongation.dateDebut)),
      dateFin: new Date(String(prolongation.dateFin)),
    })) as unknown as Prolongation[],
    echeances: brut.echeances.map((echeance) => ({
      ...echeance,
      date: new Date(String(echeance.date)),
      encaissee: echeance.encaissee === true,
    })) as unknown as Echeance[],
  };

  validerDonnees(data);
  return data;
}

function validerDonnees(data: PortfolioData): void {
  const dealIds = new Set(data.deals.map((deal) => deal.id));
  if (
    data.deals.some((deal) => typeof deal.id !== "string" || typeof deal.nom !== "string" || !Number.isFinite(deal.montant)) ||
    data.prolongations.some((prolongation) => !dealIds.has(prolongation.dealId)) ||
    data.echeances.some((echeance) => !dealIds.has(echeance.dealId) || typeof echeance.encaissee !== "boolean")
  ) {
    throw new Error("Relations ou types de portefeuille invalides");
  }

  const dates = [
    ...data.deals.map((deal) => deal.dateDebut),
    ...data.prolongations.flatMap((prolongation) => [prolongation.dateDebut, prolongation.dateFin]),
    ...data.echeances.map((echeance) => echeance.date),
  ];
  if (dates.some((date) => Number.isNaN(date.getTime()))) {
    throw new Error("Une date du fichier est invalide");
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
  const donneesExistantes = deserialiser(texte);
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
    await deserialiser(await dechiffrerAvecCle(vault, session.cle));
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
  await deserialiser(await dechiffrerAvecCle(vault, cle));
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
  await deserialiser(await dechiffrerAvecCle(vault, cle));
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
    await deserialiser(await dechiffrerAvecCle(vault, session.cle));
    await effacerTablesClaires();
    session.chiffrement = vault;
  }
  session.data = data;
}
