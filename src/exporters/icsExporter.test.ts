import { describe, expect, it } from "vitest";
import { Deal, Echeance } from "../types";
import { genererIcs } from "./icsExporter";

const deal: Deal = {
  id: "deal-1",
  nom: "Champs Elysées",
  dateDebut: new Date(2026, 0, 8, 12),
  montant: 10000,
  rendementAnnuel: 12,
  frequence: "trimestriel",
  dureeInitiale: 12,
  nombreMaxProlongations: 0,
  dureeProlongationMois: 0,
};

const echeance: Echeance = {
  id: "echeance-1",
  dealId: deal.id,
  date: new Date(2026, 3, 8, 12),
  montant: 300,
  encaissee: false,
};

describe("genererIcs", () => {
  it("génère un calendrier avec un événement et son rappel", () => {
    const ics = genererIcs(deal, [echeance]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//ClubDealApp//FR");
    expect(ics).toContain("UID:echeance-1@clubdeal-app");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260408");
    expect(ics).toContain("SUMMARY:Interets Champs Elysées - 300.00EUR");
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("génère un calendrier vide sans événement", () => {
    const ics = genererIcs(deal, []);

    expect(ics).toBe("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ClubDealApp//FR\r\nEND:VCALENDAR");
  });

  it("échappe le nom du deal dans le résumé", () => {
    const ics = genererIcs({ ...deal, nom: "A;B, C\nD" }, [echeance]);
    expect(ics).toContain("SUMMARY:Interets A\\;B\\, C\\nD - 300.00EUR");
  });
});
