import { Deal, StatutDeal } from "../types";
import { formatDateFr } from "../utils/dateUtils";

interface DealCardProps {
  deal: Deal;
  statut: StatutDeal;
  dateFin: Date;
  prochaineEcheanceDate?: Date;
  prochaineEcheanceMontant?: number;
  onClick: () => void;
}

const BADGE_CONFIG: Record<StatutDeal, { emoji: string; label: string; couleur: string }> = {
  actif: { emoji: "🟢", label: "Actif", couleur: "text-green-600" },
  enProlongation: { emoji: "🟡", label: "En prolongation", couleur: "text-yellow-600" },
  termine: { emoji: "🔴", label: "Terminé", couleur: "text-red-600" },
};

export function DealCard({
  deal,
  statut,
  dateFin,
  prochaineEcheanceDate,
  prochaineEcheanceMontant,
  onClick,
}: DealCardProps) {
  const badge = BADGE_CONFIG[statut];
  const progression = calculerProgression(deal.dateDebut, dateFin);

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 cursor-pointer active:opacity-80 transition-opacity"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{deal.nom}</h3>
        <span className={`text-sm font-medium ${badge.couleur}`}>
          {badge.emoji} {badge.label}
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-3">
        {deal.montant.toLocaleString("fr-FR")} € — {deal.rendementAnnuel}% / an
      </div>

      {prochaineEcheanceDate && statut !== "termine" && (
        <div className="text-sm mb-3">
          Prochaine échéance : {formatDateFr(prochaineEcheanceDate)}
          {prochaineEcheanceMontant !== undefined && (
            <span className="font-medium">
              {" "}
              — {prochaineEcheanceMontant.toLocaleString("fr-FR")} €
            </span>
          )}
        </div>
      )}

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progression}%` }} />
      </div>
    </div>
  );
}

function calculerProgression(dateDebut: Date, dateFin: Date): number {
  const maintenant = new Date();
  const total = dateFin.getTime() - dateDebut.getTime();
  const ecoule = maintenant.getTime() - dateDebut.getTime();
  return Math.min(100, Math.max(0, (ecoule / total) * 100));
}
