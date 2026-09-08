import Dexie, { Table } from "dexie";
import { Deal, Prolongation, Echeance } from "../types";

export class ClubDealDatabase extends Dexie {
  deals!: Table<Deal, string>;
  prolongations!: Table<Prolongation, string>;
  echeances!: Table<Echeance, string>;

  constructor() {
    super("ClubDealDatabase");

    this.version(1).stores({
      deals: "id, nom, dateDebut",
      prolongations: "id, dealId, ordre",
      echeances: "id, dealId, date",
    });
  }
}

export const db = new ClubDealDatabase();
