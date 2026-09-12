import { calculerSyntheseAnnuelle, DashboardDeal, pointsPourPeriode, PointCourbe, SyntheseAnnuelle } from "../utils/dashboard";
import { TrajectoireChart } from "./TrajectoireChart";

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

interface VueAnnuelleProps {
  deals: DashboardDeal[];
  pointsCourbe: PointCourbe[];
  suiviEncaissementsActif: boolean;
}

export function VueAnnuelle({ deals, pointsCourbe, suiviEncaissementsActif }: VueAnnuelleProps) {
  const maintenant = new Date();
  const syntheses = calculerSyntheseAnnuelle(deals, maintenant, {
    suiviEncaissements: suiviEncaissementsActif,
  });

  if (syntheses.length === 0) return null;

  return (
    <div className="mt-5">
      <h3 className="text-sm font-medium">Détail par année</h3>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        Du 1er janvier au 31 décembre, pour chaque année où des deals ont été enregistrés.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {syntheses.map((synthese) => (
          <CarteAnnee
            key={synthese.annee}
            synthese={synthese}
            points={pointsPourPeriode(
              pointsCourbe,
              new Date(synthese.annee, 0, 1, 12),
              new Date(synthese.annee, 11, 31, 23, 59),
              maintenant,
            )}
          />
        ))}
      </div>
    </div>
  );
}

function CarteAnnee({ synthese, points }: { synthese: SyntheseAnnuelle; points: PointCourbe[] }) {
  const badge = synthese.terminee
    ? { label: "Réalisé", classe: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" }
    : synthese.enCours
      ? { label: "En cours", classe: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200" }
      : { label: "Projeté", classe: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200" };

  return (
    <section
      aria-label={"Année " + synthese.annee}
      className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-[#1a2234]"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold tabular-nums">{synthese.annee}</h4>
        <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + badge.classe}>{badge.label}</span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Ligne label="Engagé 01/01" valeur={montant(synthese.capitalEngageOuverture)} />
        <Ligne label="Engagé 31/12" valeur={montant(synthese.capitalEngageCloture)} />
        <Ligne label="Nouveaux placements" valeur={montant(synthese.nouveauxPlacements)} />
        <Ligne label="Réinvestissements" valeur={montant(synthese.reinvestissements)} />
        <Ligne label="Capital récupéré" valeur={montant(synthese.remboursements)} />
        <Ligne label="Cash 31/12" valeur={montant(synthese.cashCloture)} />
        <Ligne
          label="Intérêts de l’année"
          valeur={
            synthese.interetsFutursAnnee > 0
              ? montant(synthese.interetsAcquisAnnee) + " + " + montant(synthese.interetsFutursAnnee)
              : montant(synthese.interetsAcquisAnnee)
          }
          couleur="text-emerald-700 dark:text-emerald-300"
        />
        <Ligne label="Gains futurs restants" valeur={montant(synthese.gainsFutursRestants)} couleur="text-emerald-700 dark:text-emerald-300" />
        <Ligne label="Valeur 31/12" valeur={montant(synthese.valeurCloture)} couleur="text-slate-900 dark:text-white" />
        <Ligne
          label="Performance"
          valeur={pourcentage(synthese.performanceAnnee)}
          couleur="text-purple-700 dark:text-purple-300"
        />
      </dl>

      <TrajectoireChart points={points} compact />
    </section>
  );
}

function Ligne({
  label,
  valeur,
  couleur = "text-slate-900 dark:text-white",
}: {
  label: string;
  valeur: string;
  couleur?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={"font-semibold tabular-nums " + couleur}>{valeur}</dd>
    </div>
  );
}
