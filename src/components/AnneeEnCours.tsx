import { SyntheseAnnuelle } from "../utils/dashboard";

const formatMontant = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function montant(value: number): string {
  return formatMontant.format(value);
}

export function AnneeEnCours({ synthese }: { synthese: SyntheseAnnuelle }) {
  if (synthese.interetsAnnee <= 0) return null;

  const ratio = Math.min(1, Math.max(0, synthese.interetsAcquisAnnee / synthese.interetsAnnee));
  const pourcentageAcquis = Math.round(ratio * 100);

  return (
    <section
      aria-label={"Année en cours " + synthese.annee}
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-black/10"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          Cette année · {synthese.annee}
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
          En cours
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Gains acquis depuis le 1ᵉʳ janvier
          </div>
          <div className="mt-0.5 text-base font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {montant(synthese.interetsAcquisAnnee)}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Gains à venir jusqu’au 31 décembre
          </div>
          <div className="mt-0.5 text-base font-semibold tabular-nums text-purple-700 dark:text-purple-300">
            {montant(synthese.interetsFutursAnnee)}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: pourcentageAcquis + "%" }}
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span>{pourcentageAcquis} % de l’année acquis</span>
          <span>
            Total prévu :{" "}
            <strong className="font-semibold text-slate-700 dark:text-slate-200">
              {montant(synthese.interetsAnnee)}
            </strong>
          </span>
        </div>
      </div>
    </section>
  );
}
