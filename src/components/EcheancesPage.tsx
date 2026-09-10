import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { annulerEcheanceEncaissee, marquerEcheanceEncaissee } from "../db/repositories";
import { useToutesLesEcheances } from "../hooks/useToutesLesEcheances";
import { formatDateFr } from "../utils/dateUtils";

interface EcheancesPageProps {
  suiviEncaissementsActif: boolean;
}

type FiltreEcheances = "toutes" | "aPointer" | "aVenir" | "encaissees";

function formatMontant(montant: number): string {
  return `${montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function EcheancesPage({ suiviEncaissementsActif }: EcheancesPageProps) {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtre, setFiltre] = useState<FiltreEcheances>("toutes");
  const scrollARestaurer = useRef<number | null>(null);
  const { echeances, loading } = useToutesLesEcheances(refreshKey);
  const maintenant = useMemo(() => new Date(), [refreshKey]);

  const estEchue = (date: Date) => date.getTime() <= maintenant.getTime();

  const nbAPointer = echeances.filter((echeance) => !echeance.encaissee && estEchue(echeance.date)).length;
  const nbAVenir = echeances.filter((echeance) => !echeance.encaissee && !estEchue(echeance.date)).length;
  const nbEncaissees = echeances.filter((echeance) => echeance.encaissee).length;
  const totalEcheances = echeances.reduce((total, echeance) => total + echeance.montant, 0);
  const totalEncaisse = echeances
    .filter((echeance) => echeance.encaissee)
    .reduce((total, echeance) => total + echeance.montant, 0);
  const totalARecevoir = totalEcheances - totalEncaisse;

  useEffect(() => {
    if (loading || scrollARestaurer.current === null) return;
    const scrollY = scrollARestaurer.current;
    const frame = window.requestAnimationFrame(() => {
      const hauteurMaximale = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo(0, Math.min(scrollY, hauteurMaximale));
      scrollARestaurer.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [echeances, loading]);

  const echeancesFiltrees = useMemo(() => {
    const echeancesTriees = [...echeances].sort((a, b) => a.date.getTime() - b.date.getTime());

    return echeancesTriees.filter((echeance) => {
      if (filtre === "aPointer") return !echeance.encaissee && estEchue(echeance.date);
      if (filtre === "aVenir") return !echeance.encaissee && !estEchue(echeance.date);
      if (filtre === "encaissees") return echeance.encaissee;
      return true;
    });
  }, [echeances, filtre, maintenant]);

  const totauxParMois = useMemo(() => {
    const totaux = new Map<string, number>();
    for (const echeance of echeancesFiltrees) {
      const groupe = groupeMois(echeance.date);
      totaux.set(groupe, (totaux.get(groupe) ?? 0) + echeance.montant);
    }
    return totaux;
  }, [echeancesFiltrees]);

  function groupeMois(date: Date): string {
    const libelle = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
    return libelle.charAt(0).toUpperCase() + libelle.slice(1);
  }

  async function pointer(echeanceId: string) {
    scrollARestaurer.current = window.scrollY;
    await marquerEcheanceEncaissee(echeanceId);
    setRefreshKey((value) => value + 1);
  }

  async function depointer(echeanceId: string) {
    scrollARestaurer.current = window.scrollY;
    await annulerEcheanceEncaissee(echeanceId);
    setRefreshKey((value) => value + 1);
  }

  return (
    <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-blue-500/10 bg-gradient-to-b from-slate-50 to-white p-4 pb-28 text-slate-900 shadow-sm dark:from-[#141d2e] dark:to-[#0e1422] dark:text-white">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Suivi</p>
        <h2 className="mt-1 text-xl font-semibold">Échéances</h2>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/5 dark:bg-[#111827]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Échéancier de trésorerie</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{formatMontant(totalEcheances)}</p>
            <p className="mt-1 text-xs text-slate-500">Sur la période affichée</p>
          </div>
          <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            {nbAPointer} à pointer
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-white/5">
            <div className="text-xs text-slate-500">Déjà encaissé</div>
            <div className="mt-1 font-semibold text-emerald-700 dark:text-emerald-300">{formatMontant(totalEncaisse)}</div>
          </div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-white/5">
            <div className="text-xs text-slate-500">À recevoir</div>
            <div className="mt-1 font-semibold text-blue-700 dark:text-blue-300">{formatMontant(totalARecevoir)}</div>
          </div>
        </div>
      </div>

      {!loading && echeances.length > 0 && (
        <div className="mb-5 flex gap-2" role="tablist" aria-label="Filtrer les échéances">
          {([
            ["toutes", `Toutes (${echeances.length})`],
            ["aPointer", `À pointer (${nbAPointer})`],
            ["aVenir", `À venir (${nbAVenir})`],
            ["encaissees", `Encaissées (${nbEncaissees})`],
          ] as const).map(([valeur, libelle]) => (
            <button
              key={valeur}
              type="button"
              role="tab"
              aria-selected={filtre === valeur}
              onClick={() => setFiltre(valeur)}
              className={
                "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors " +
                (filtre === valeur
                  ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "border-slate-200 text-slate-500 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:text-white")
              }
            >
              {libelle}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-slate-500 dark:text-slate-400">Chargement des échéances...</p>
      ) : echeances.length === 0 ? (
        <p className="py-8 text-center text-slate-500 dark:text-slate-400">Aucune échéance pour l’instant.</p>
      ) : echeancesFiltrees.length === 0 ? (
        <p className="py-8 text-center text-slate-500 dark:text-slate-400">Aucune échéance dans ce filtre.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {echeancesFiltrees.map((echeance, index) => {
            const echue = estEchue(echeance.date);
            const groupe = groupeMois(echeance.date);
            const groupePrecedent = index > 0 ? groupeMois(echeancesFiltrees[index - 1].date) : null;

            return (
              <Fragment key={echeance.id}>
                {groupe !== groupePrecedent && (
                  <div className="mt-2 flex items-center justify-between border-b border-slate-200 pb-2 first:mt-0 dark:border-white/10">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{groupe}</h3>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{formatMontant(totauxParMois.get(groupe) ?? 0)}</span>
                  </div>
                )}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/5 dark:bg-[#111827]">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/deal/${echeance.dealId}`)}
                      className="min-w-0 text-left"
                    >
                      <div className="truncate font-semibold text-slate-900 dark:text-white">{echeance.nomDeal}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <CalendarClock size={15} aria-hidden="true" />
                        {formatDateFr(echeance.date)}
                      </div>
                    </button>
                    <span className="shrink-0 font-semibold text-emerald-700 dark:text-emerald-300">{formatMontant(echeance.montant)}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        echeance.encaissee ? "text-emerald-700 dark:text-emerald-300" : echue ? "text-amber-700 dark:text-amber-300" : "text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {echeance.encaissee && <Check size={14} aria-hidden="true" />}
                      {echeance.encaissee ? "Encaissé" : echue ? "À pointer" : "À venir"}
                    </span>
                    {suiviEncaissementsActif && (echeance.encaissee ? (
                      <button
                        type="button"
                        onClick={() => depointer(echeance.id)}
                        className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-500/50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                      >
                        Dépointer
                      </button>
                    ) : echue ? (
                      <button
                        type="button"
                        onClick={() => pointer(echeance.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                      >
                        <Check size={13} aria-hidden="true" />
                        Pointer
                      </button>
                    ) : null)}
                  </div>
                  {!echeance.encaissee && echue && suiviEncaissementsActif && (
                    <p className="mt-2 text-right text-[11px] text-slate-500">Reçu sur votre compte ?</p>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}
    </section>
  );
}
