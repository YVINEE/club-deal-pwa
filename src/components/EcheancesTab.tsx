import { Echeance } from "../types";
import { formatDateFr } from "../utils/dateUtils";
import { Check } from "lucide-react";

interface EcheancesTabProps {
  echeances: Echeance[];
  loading: boolean;
  suiviEncaissementsActif: boolean;
  onPointer: (echeanceId: string) => Promise<void>;
}

type StatutEcheance = "passee" | "aujourdhui" | "future";

function statutEcheance(date: Date): StatutEcheance {
  const maintenant = new Date();
  const memeJour =
    date.getFullYear() === maintenant.getFullYear() &&
    date.getMonth() === maintenant.getMonth() &&
    date.getDate() === maintenant.getDate();

  if (memeJour) return "aujourdhui";
  return date < maintenant ? "passee" : "future";
}

const STYLE_PAR_STATUT: Record<StatutEcheance, string> = {
  passee: "text-green-600 bg-green-50 dark:bg-green-950",
  aujourdhui: "text-orange-600 bg-orange-50 dark:bg-orange-950",
  future: "text-blue-600 bg-blue-50 dark:bg-blue-950",
};

export function EcheancesTab({ echeances, loading, suiviEncaissementsActif, onPointer }: EcheancesTabProps) {
  if (loading) {
    return <div className="text-center text-gray-500 py-8">Chargement des échéances...</div>;
  }

  if (echeances.length === 0) {
    return <div className="text-center text-gray-500 py-8">Aucune échéance pour ce deal</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {echeances.map((echeance) => {
        const statut = statutEcheance(echeance.date);
        return (
          <div
            key={echeance.id}
            className={`flex items-center justify-between rounded-lg px-4 py-3 ${STYLE_PAR_STATUT[statut]}`}
          >
            <div className="flex items-center gap-2">
              {(statut === "passee" || (suiviEncaissementsActif && echeance.encaissee)) && <Check size={16} aria-hidden="true" />}
              <span className="font-medium">{formatDateFr(echeance.date)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">
                {echeance.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
              {suiviEncaissementsActif && !echeance.encaissee && echeance.date <= new Date() && (
                <button
                  type="button"
                  onClick={() => onPointer(echeance.id)}
                  className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white"
                >
                  Pointer
                </button>
              )}
              {suiviEncaissementsActif && echeance.encaissee && (
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Encaissé</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
