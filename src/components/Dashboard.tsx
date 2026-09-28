import { useMemo } from "react";
import { differenceInCalendarDays } from "date-fns";
import { CalendarClock, Check, ChevronDown, Plus, TrendingUp } from "lucide-react";
import { formatDateFr } from "../utils/dateUtils";
import { calculerSyntheseDashboard, calculerSynthesePourAnnee, nombreDealsEnCours, DashboardDeal } from "../utils/dashboard";
import { TrajectoireChart } from "./TrajectoireChart";
import { VueAnnuelle } from "./VueAnnuelle";
import { AnneeEnCours } from "./AnneeEnCours";

interface DashboardProps {
  deals: DashboardDeal[];
  suiviEncaissementsActif: boolean;
  onPointer: (echeanceId: string) => Promise<void>;
  onAjouterDeal: () => void;
}

const formatMontant = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const formatPourcentage = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function montant(value: number): string {
  return formatMontant.format(value);
}

function pourcentage(value: number): string {
  return formatPourcentage.format(value) + " %";
}

export function Dashboard({ deals, suiviEncaissementsActif, onPointer, onAjouterDeal }: DashboardProps) {
  const synthese = useMemo(
    () => calculerSyntheseDashboard(deals, new Date(), { suiviEncaissements: suiviEncaissementsActif, capitalEngageNet: true }),
    [deals, suiviEncaissementsActif],
  );
  const syntheseAnneeEnCours = useMemo(
    () =>
      calculerSynthesePourAnnee(deals, new Date().getFullYear(), new Date(), {
        suiviEncaissements: suiviEncaissementsActif,
      }),
    [deals, suiviEncaissementsActif],
  );
  const dealsEnCours = nombreDealsEnCours(deals, new Date());

  if (deals.length === 0) {
    return (
      <section
        aria-labelledby="dashboard-title"
        className="mx-4 mt-4 overflow-hidden rounded-2xl border border-blue-500/10 bg-gradient-to-b from-slate-50 to-white p-4 text-slate-900 shadow-sm dark:from-[#141d2e] dark:to-[#0e1422] dark:text-white"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Portefeuille</p>
            <h2 id="dashboard-title" className="mt-1 text-lg font-semibold">
              Vue d’ensemble
            </h2>
          </div>
          <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
            <TrendingUp size={18} aria-hidden="true" />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-white/10 dark:bg-black/10">
          <p className="text-sm font-semibold">Bienvenue dans votre suivi</p>
          <p className="mx-auto mt-2 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            Aucun deal enregistré pour l’instant. Ajoutez votre premier deal pour voir la valeur de votre portefeuille,
            votre prochaine échéance et sa trajectoire.
          </p>
          <button
            type="button"
            onClick={onAjouterDeal}
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors active:bg-emerald-700"
          >
            <Plus size={16} aria-hidden="true" />
            Ajouter mon premier deal
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="dashboard-title" className="mx-4 mt-4 overflow-hidden rounded-2xl border border-blue-500/10 bg-gradient-to-b from-slate-50 to-white p-4 text-slate-900 shadow-sm dark:from-[#141d2e] dark:to-[#0e1422] dark:text-white">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Portefeuille</p>
          <h2 id="dashboard-title" className="mt-1 text-lg font-semibold">
            Vue d’ensemble
          </h2>
        </div>
        <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
          <TrendingUp size={18} aria-hidden="true" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-black/10">
        <div className="text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Valeur actuelle</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <strong className="text-2xl font-bold tabular-nums">{montant(synthese.valeurActuelle)}</strong>
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            +{pourcentage(synthese.performanceBrute)} · +{montant(synthese.interetsAcquis)}
          </span>
        </div>
      </div>

      {synthese.prochaineEcheance && (
        <EcheanceBanner
          date={synthese.prochaineEcheance.date}
          montantEcheance={synthese.prochaineEcheance.montant}
          nomDeal={synthese.prochaineEcheanceDealNom}
          echeanceId={synthese.prochaineEcheance.id}
          suiviEncaissementsActif={suiviEncaissementsActif}
          onPointer={onPointer}
        />
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-black/10">
        <div className="text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Capital en cours</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <strong className="text-xl font-bold tabular-nums">{montant(synthese.capitalEngage)}</strong>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {dealsEnCours} deal{dealsEnCours > 1 ? "s" : ""} en cours
          </span>
        </div>
      </div>

      <details className="group mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-black/10">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span>
            <span className="font-semibold">Voir l’analyse</span>
            <span className="mt-0.5 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
              Indicateurs détaillés, graphique et détail par année
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="shrink-0 text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400"
          />
        </summary>

        <div className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Indicateur label="Capital récupéré" valeur={montant(synthese.capitalRecupere)} />
            <Indicateur label="Apports externes nets" valeur={montant(synthese.apportsExternesNets)} />
            <Indicateur label="Gains acquis cumulés" valeur={montant(synthese.interetsAcquis)} couleur="text-emerald-700 dark:text-emerald-300" />
            <Indicateur label="Gains futurs cumulés" valeur={montant(synthese.interetsFuturs)} couleur="text-emerald-700 dark:text-emerald-300" />
            <Indicateur label="Total final prévu" valeur={montant(synthese.totalFinal)} couleur="text-purple-700 dark:text-purple-300" />
          </div>

          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Rendement moyen pondéré :{" "}
            <strong className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {pourcentage(synthese.rendementMoyenPondere)}
            </strong>
          </div>

          <AnneeEnCours synthese={syntheseAnneeEnCours} />

          <div className="mt-5 text-sm font-medium">Trajectoire du portefeuille</div>
          <TrajectoireChart points={synthese.pointsCourbe} />

          <VueAnnuelle
            deals={deals}
            pointsCourbe={synthese.pointsCourbe}
            suiviEncaissementsActif={suiviEncaissementsActif}
          />
        </div>
      </details>
    </section>
  );
}

function Indicateur({
  label,
  valeur,
  couleur = "text-slate-900 dark:text-white",
}: {
  label: string;
  valeur: string;
  couleur?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-white/5 dark:bg-[#1a2234]">
      <div className="text-[11px] uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className={"mt-1 text-base font-semibold tabular-nums " + couleur}>{valeur}</div>
    </div>
  );
}

function EcheanceBanner({
  date,
  montantEcheance,
  nomDeal,
  echeanceId,
  suiviEncaissementsActif,
  onPointer,
}: {
  date: Date;
  montantEcheance: number;
  nomDeal?: string;
  echeanceId: string;
  suiviEncaissementsActif: boolean;
  onPointer: (echeanceId: string) => Promise<void>;
}) {
  const jours = differenceInCalendarDays(date, new Date());
  const delai =
    jours < 0
      ? "En retard de " + Math.abs(jours) + " jour" + (Math.abs(jours) > 1 ? "s" : "")
      : jours === 0
        ? "Aujourd’hui"
        : jours === 1
          ? "Demain"
          : "Dans " + jours + " jours";

  return (
    <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
        <CalendarClock size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-[0.04em] text-blue-700 dark:text-blue-200">{delai}</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-semibold text-slate-900 dark:text-white">
          <span className="whitespace-nowrap">{formatDateFr(date)}</span>
          <span className="whitespace-nowrap text-emerald-700 dark:text-emerald-300">Coupon : {montant(montantEcheance)}</span>
        </div>
        {nomDeal && <div className="truncate text-xs text-slate-500 dark:text-slate-400">{nomDeal}</div>}
      </div>
      {suiviEncaissementsActif && date <= new Date() && (
        <button
          type="button"
          onClick={() => onPointer(echeanceId)}
          className="col-span-2 flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:w-auto"
        >
          <Check size={14} aria-hidden="true" />
          Pointer
        </button>
      )}
    </div>
  );
}
