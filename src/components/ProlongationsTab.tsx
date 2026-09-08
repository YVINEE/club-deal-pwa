import { Deal, Prolongation, StatutDeal } from "../types";
import { formatDateFr } from "../utils/dateUtils";
import { peutProlonger } from "../utils/statusUtils";
import { Button } from "@/components/ui/button";

interface ProlongationsTabProps {
  deal: Deal;
  prolongations: Prolongation[];
  statut: StatutDeal;
  onProlonger: () => Promise<void>;
  erreur: string | null;
}

export function ProlongationsTab({ deal, prolongations, statut, onProlonger, erreur }: ProlongationsTabProps) {
  const disponible = statut !== "termine" && peutProlonger(deal, prolongations);

  return (
    <div className="flex flex-col gap-4">
      {prolongations.length === 0 ? (
        <div className="text-center text-gray-500 py-8">Aucune prolongation pour ce deal</div>
      ) : (
        <div className="flex flex-col gap-2">
          {prolongations.map((prolongation) => (
            <div key={prolongation.id} className="rounded-lg border border-border px-4 py-3">
              <div className="text-sm font-medium">Prolongation n°{prolongation.ordre}</div>
              <div className="text-sm text-gray-500">
                Du {formatDateFr(prolongation.dateDebut)} au {formatDateFr(prolongation.dateFin)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-sm text-gray-500 text-center">
        {prolongations.length} / {deal.nombreMaxProlongations} prolongation(s) utilisée(s)
      </div>

      {erreur && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-lg px-4 py-3 text-center">
          {erreur}
        </div>
      )}

      {disponible && (
        <Button onClick={onProlonger} className="h-12 mt-2">
          Prolonger de {deal.dureeProlongationMois} mois
        </Button>
      )}

      {!disponible && statut !== "termine" && prolongations.length >= deal.nombreMaxProlongations && (
        <div className="text-sm text-gray-500 text-center">Nombre maximum de prolongations atteint</div>
      )}
    </div>
  );
}
