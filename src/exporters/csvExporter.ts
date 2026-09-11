import { Deal, Echeance } from "../types";
import { formatDateFr } from "../utils/dateUtils";

function echapperCelluleCsv(valeur: string): string {
  const securisee = /^[=+\-@]/.test(valeur) ? `'${valeur}` : valeur;
  return /[;"\r\n]/.test(securisee) ? `"${securisee.replace(/"/g, '""')}"` : securisee;
}

export function genererCsv(deal: Deal, echeances: Echeance[]): string {
  const entete = "Date;Montant;Type;Deal";
  const lignes = echeances.map(
    (e) => [formatDateFr(e.date), e.montant.toFixed(2), "Interet", deal.nom].map(echapperCelluleCsv).join(";")
  );
  return [entete, ...lignes].join("\n");
}

export function telechargerCsv(deal: Deal, echeances: Echeance[]): void {
  const contenu = genererCsv(deal, echeances);
  const blob = new Blob(["\uFEFF", contenu], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `echeances-${deal.nom.replace(/\s+/g, "-")}.csv`;
  lien.click();

  URL.revokeObjectURL(url);
}
