import { Deal, StatutDeal } from "../types";
import { differenceInCalendarMonths } from "date-fns";
import { Clock3 } from "lucide-react";
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
  const dureeMois = Math.max(1, differenceInCalendarMonths(dateFin, deal.dateDebut));
  const moisEcoules = Math.min(dureeMois, Math.max(0, differenceInCalendarMonths(new Date(), deal.dateDebut)));
  const progressionArrondie = Math.round(progression);
  const badgeClasses =
    statut === "enProlongation"
      ? "bg-amber-400/10 text-amber-300"
      : statut === "actif"
        ? "bg-emerald-400/10 text-emerald-300"
        : "bg-red-400/10 text-red-300";

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-2xl border border-transparent bg-white p-4 shadow-sm transition-opacity active:opacity-80 dark:border-white/5 dark:bg-[#111827]"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{deal.nom}</h3>
        <span className={"rounded-full px-2 py-1 text-xs font-medium " + badgeClasses}>
          {badge.emoji} {badge.label}
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-3">
        {deal.montant.toLocaleString("fr-FR")} € — {deal.rendementAnnuel}% / an · {deal.frequence === "trimestriel" ? "Trimestriel" : "Semestriel"}
      </div>

      {prochaineEcheanceDate && statut !== "termine" && (
        <div className="mb-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-500">Prochaine échéance</div>
            <div className="mt-1 font-medium">{formatDateFr(prochaineEcheanceDate)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-500">Montant coupon</div>
            <div className="mt-1 font-semibold text-emerald-600 dark:text-emerald-300">
              {prochaineEcheanceMontant !== undefined ? prochaineEcheanceMontant.toLocaleString("fr-FR") + " €" : "—"}
            </div>
          </div>
        </div>
      )}

      {statut === "enProlongation" && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <Clock3 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Maturité étendue · remboursement cible {formatDateFr(dateFin)}</span>
        </div>
      )}

      <div className="mb-1 flex justify-between text-xs text-gray-500">
        <span>Avancement contractuel</span>
        <span>{moisEcoules}/{dureeMois} mois ({progressionArrondie}%)</span>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700"
        aria-label={"Avancement contractuel : " + progressionArrondie + "%"}
      >
        <div
          className={
            "h-1.5 rounded-full transition-all " +
            (statut === "enProlongation" ? "bg-amber-400" : "bg-blue-600")
          }
          style={{ width: progression + "%" }}
        />
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
