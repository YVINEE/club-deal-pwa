import Dexie, { Table } from "dexie";
import { Deal, Prolongation, Echeance } from "../types";

export class ClubDealDatabase extends Dexie {
  deals!: Table<Deal, string>;
  prolongations!: Table<Prolongation, string>;
  echeances!: Table<Echeance, string>;
  vault!: Table<EncryptedVault, string>;

  constructor() {
    super("ClubDealDatabase");

    this.version(1).stores({
      deals: "id, nom, dateDebut",
      prolongations: "id, dealId, ordre",
      echeances: "id, dealId, date",
    });

    this.version(2)
      .stores({
        deals: "id, nom, dateDebut",
        prolongations: "id, dealId, ordre",
        echeances: "id, dealId, date",
      })
      .upgrade((transaction) => {
        const maintenant = new Date();
        return transaction.table("echeances").toCollection().modify((echeance: Echeance) => {
          echeance.encaissee = new Date(echeance.date) <= maintenant;
        });
      });

    this.version(3).stores({
      deals: "id, nom, dateDebut",
      prolongations: "id, dealId, ordre",
      echeances: "id, dealId, date",
      vault: "id",
    });
  }
}

export interface EncryptedVault {
  id: string;
  formatVersion: 1;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export const db = new ClubDealDatabase();
