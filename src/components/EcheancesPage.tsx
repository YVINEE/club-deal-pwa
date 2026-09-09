import { Fragment, useMemo, useState } from "react";
import { CalendarClock, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { annulerEcheanceEncaissee, marquerEcheanceEncaissee } from "../db/repositories";
import { useToutesLesEcheances } from "../hooks/useToutesLesEcheances";
import { formatDateFr } from "../utils/dateUtils";

interface EcheancesPageProps {
  suiviEncaissementsActif: boolean;
}

export function EcheancesPage({ suiviEncaissementsActif }: EcheancesPageProps) {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const { echeances, loading } = useToutesLesEcheances(refreshKey);
  const maintenant = new Date();
  const echeancesTriees = useMemo(
    () => [...echeances].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [echeances],
  );

  function groupeMois(date: Date): string {
    const libelle = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
    return libelle.charAt(0).toUpperCase() + libelle.slice(1);
  }

  async function pointer(echeanceId: string) {
    await marquerEcheanceEncaissee(echeanceId);
    setRefreshKey((value) => value + 1);
  }

  async function depointer(echeanceId: string) {
    await annulerEcheanceEncaissee(echeanceId);
    setRefreshKey((value) => value + 1);
  }

  return (
    <section className="p-4">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500">Suivi</p>
        <h2 className="mt-1 text-xl font-semibold">Échéances</h2>
      </div>

      {loading ? (
        <p className="py-8 text-center text-gray-500">Chargement des échéances...</p>
      ) : echeancesTriees.length === 0 ? (
        <p className="py-8 text-center text-gray-500">Aucune échéance pour l’instant.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {echeancesTriees.map((echeance, index) => {
            const echue = echeance.date <= maintenant;
            const groupe = groupeMois(echeance.date);
            const groupePrecedent = index > 0 ? groupeMois(echeancesTriees[index - 1].date) : null;
            return (
              <Fragment key={echeance.id}>
                {groupe !== groupePrecedent && <h3 className="mt-3 border-b border-border pb-2 text-sm font-semibold text-gray-500 first:mt-0">{groupe}</h3>}
                <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/deal/${echeance.dealId}`)}
                    className="min-w-0 text-left"
                  >
                    <div className="truncate font-semibold">{echeance.nomDeal}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                      <CalendarClock size={15} aria-hidden="true" />
                      {formatDateFr(echeance.date)}
                    </div>
                  </button>
                  <span className="shrink-0 font-semibold">
                    {echeance.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${echeance.encaissee ? "text-emerald-600" : echue ? "text-orange-600" : "text-blue-600"}`}>
                    {echeance.encaissee && <Check size={14} aria-hidden="true" />}
                    {echeance.encaissee ? "Encaissé" : echue ? "À pointer" : "À venir"}
                  </span>
                  {suiviEncaissementsActif && (echeance.encaissee ? (
                    <button type="button" onClick={() => depointer(echeance.id)} className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Dépointer
                    </button>
                  ) : echue ? (
                    <button type="button" onClick={() => pointer(echeance.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                      <Check size={13} aria-hidden="true" />
                      Pointer
                    </button>
                  ) : null)}
                </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      )}
    </section>
  );
}
