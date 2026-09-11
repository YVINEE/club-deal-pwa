import { Deal, StatutDeal } from "../types";
import { differenceInCalendarDays, differenceInCalendarMonths } from "date-fns";
import { ArrowDownToLine, CalendarClock, CalendarDays, Clock3 } from "lucide-react";
import { formatDateCourteFr, formatDateFr } from "../utils/dateUtils";
import { dealCommenceAvantEvolutionFiscale } from "../utils/calculs";

interface DealCardProps {
  deal: Deal;
  statut: StatutDeal;
  dateFin: Date;
  prochaineEcheanceDate?: Date;
  prochaineEcheanceMontant?: number;
  onClick: () => void;
  id?: string;
}

const BADGE_CONFIG: Record<StatutDeal, { label: string; dot: string }> = {
  actif: { label: "Actif", dot: "bg-emerald-600 dark:bg-emerald-400" },
  enProlongation: { label: "En prolongation", dot: "bg-amber-600 dark:bg-amber-400" },
  termine: { label: "Terminé", dot: "bg-red-600 dark:bg-red-400" },
};

export function DealCard({
  deal,
  statut,
  dateFin,
  prochaineEcheanceDate,
  prochaineEcheanceMontant,
  onClick,
  id,
}: DealCardProps) {
  const badge = BADGE_CONFIG[statut];
  const progression = calculerProgression(deal.dateDebut, dateFin);
  const dureeMois = Math.max(1, differenceInCalendarMonths(dateFin, deal.dateDebut));
  const moisEcoules = Math.min(dureeMois, Math.max(0, differenceInCalendarMonths(new Date(), deal.dateDebut)));
  const progressionArrondie = Math.round(progression);
  const joursAvantEcheance = prochaineEcheanceDate
    ? differenceInCalendarDays(prochaineEcheanceDate, new Date())
    : undefined;
  const badgeClasses =
    statut === "enProlongation"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
      : statut === "actif"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
        : "bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-300";

  return (
    <div
      id={id}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer rounded-2xl border border-transparent bg-white p-4 shadow-sm transition-opacity active:opacity-80 dark:border-white/5 dark:bg-[#111827]"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{deal.nom}</h3>
        <span className={"rounded-full px-2 py-1 text-xs font-medium " + badgeClasses}>
          <span className={"mr-1 inline-block h-1.5 w-1.5 rounded-full " + badge.dot} aria-hidden="true" />
          {badge.label}
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-3">
        {deal.montant.toLocaleString("fr-FR")} € — {deal.rendementAnnuel}% net / an · {deal.frequence === "trimestriel" ? "Trimestriel" : "Semestriel"}
      </div>
      {deal.appliquerEvolutionFiscale === true && dealCommenceAvantEvolutionFiscale(deal.dateDebut) && (
        <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Coupons ajustés depuis le 1er janvier 2026
        </div>
      )}

      <div
        className={
          "mb-3 flex items-center gap-3 rounded-xl border p-3 " +
          (statut === "enProlongation"
            ? "border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
            : "border-blue-100 bg-blue-50/70 dark:border-blue-500/20 dark:bg-blue-500/10")
        }
      >
        <CalendarClock
          size={20}
          className={statut === "enProlongation" ? "text-amber-600 dark:text-amber-300" : "text-blue-600 dark:text-blue-300"}
          aria-hidden="true"
        />
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Fin prévue
          </div>
          <div className="mt-0.5 text-base font-semibold text-slate-900 dark:text-white">
            {formatDateFr(dateFin)}
          </div>
        </div>
      </div>

      {prochaineEcheanceDate && statut !== "termine" && (
        <div className="mb-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
          <div className="min-w-0 border-r border-slate-200 pr-2 dark:border-white/10">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              <CalendarDays size={13} aria-hidden="true" />
              <span className="truncate">Échéance</span>
            </div>
            <div className="mt-1 font-medium">{formatDateCourteFr(prochaineEcheanceDate)}</div>
            {joursAvantEcheance !== undefined && (
              <div className="mt-1 text-xs text-slate-500">
                {joursAvantEcheance < 0
                  ? `En retard de ${Math.abs(joursAvantEcheance)} jour${Math.abs(joursAvantEcheance) > 1 ? "s" : ""}`
                  : `Dans ${joursAvantEcheance} jour${joursAvantEcheance > 1 ? "s" : ""}`}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              <ArrowDownToLine size={13} aria-hidden="true" />
              <span className="truncate">Coupon prévu</span>
            </div>
            <div className="mt-1 font-semibold text-emerald-600 dark:text-emerald-300">
              {prochaineEcheanceMontant !== undefined ? prochaineEcheanceMontant.toLocaleString("fr-FR") + " €" : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">Montant contractuel</div>
          </div>
        </div>
      )}

      {statut === "enProlongation" && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
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
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressionArrondie}
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
