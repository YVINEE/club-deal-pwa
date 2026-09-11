import { Deal, Echeance } from "../types";

function formatDateIcs(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatTimestampIcs(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function echapperTexteIcs(valeur: string): string {
  return valeur.replace(/\\/g, "\\\\").replace(/([;,])/g, "\\$1").replace(/\r?\n/g, "\\n");
}

function replierLigneIcs(ligne: string): string {
  const morceaux: string[] = [];
  let courant = "";
  for (const caractere of ligne) {
    const octets = new TextEncoder().encode(courant + caractere).length;
    if (courant && octets > 75) {
      morceaux.push(courant);
      courant = " " + caractere;
    } else {
      courant += caractere;
    }
  }
  if (courant) morceaux.push(courant);
  return morceaux.join("\r\n");
}

function genererEvenement(deal: Deal, echeance: Echeance): string {
  const dtstart = formatDateIcs(echeance.date);
  const uid = `${echeance.id}@clubdeal-app`;
  const maintenant = formatTimestampIcs(new Date());
  const titre = echapperTexteIcs(`Interets ${deal.nom} - ${echeance.montant.toFixed(2)}EUR`);

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${maintenant}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `SUMMARY:${titre}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rappel echeance",
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
  ].map(replierLigneIcs).join("\r\n");
}

export function genererIcs(deal: Deal, echeances: Echeance[]): string {
  const evenements = echeances.map((e) => genererEvenement(deal, e));

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ClubDealApp//FR", ...evenements, "END:VCALENDAR"].join(
    "\r\n"
  );
}

export function telechargerIcs(deal: Deal, echeances: Echeance[]): void {
  const contenu = genererIcs(deal, echeances);
  const blob = new Blob([contenu], { type: "text/calendar;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `echeances-${deal.nom.replace(/\s+/g, "-")}.ics`;
  lien.click();

  URL.revokeObjectURL(url);
}
