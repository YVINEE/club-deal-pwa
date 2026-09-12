import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDeals } from "../hooks/useDeals";
import { DealCard } from "./DealCard";
import { Plus } from "lucide-react";
import { calculerCapitalEngageNet } from "../utils/reinvestissements";

interface DealListProps {
  onSelectDeal: (dealId: string, etatRetour: DealListViewState) => void;
  onAjouterDeal: (etatRetour: DealListViewState) => void;
  suiviEncaissements: boolean;
}

const optionsTri = ["prochaineEcheance", "montant", "dateFin"] as const;
export type TriDeals = (typeof optionsTri)[number];
type FiltreDeals = "tous" | "actifs" | "termines";
const cleTri = "club-deal-tri-deals";

export interface DealListViewState {
  scrollY: number;
  filtre: FiltreDeals;
  tri: TriDeals;
  dealId?: string;
}

export interface DealsNavigationState {
  retourDeals?: DealListViewState;
}

function lireTri(): TriDeals {
  const valeur = localStorage.getItem(cleTri);
  return optionsTri.includes(valeur as TriDeals)
    ? (valeur as TriDeals)
    : "dateFin";
}

export function DealList({
  onSelectDeal,
  onAjouterDeal,
  suiviEncaissements,
}: DealListProps) {
  const location = useLocation();
  const { deals, loading, error } = useDeals(suiviEncaissements);
  const etatRetour = (location.state as DealsNavigationState | null)?.retourDeals;
  const [filtre, setFiltre] = useState<FiltreDeals>(() => etatRetour?.filtre ?? "actifs");
  const [tri, setTri] = useState<TriDeals>(() => etatRetour?.tri ?? lireTri());
  const restaurationEffectuee = useRef(false);
  const dealsTries = [...deals].sort((a, b) => {
    if (tri === "montant") {
      return b.deal.montant - a.deal.montant
        || (a.prochaineEcheanceDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.prochaineEcheanceDate?.getTime() ?? Number.MAX_SAFE_INTEGER)
        || a.deal.nom.localeCompare(b.deal.nom, "fr");
    }
    if (tri === "dateFin") {
      return a.dateFin.getTime() - b.dateFin.getTime()
        || a.deal.nom.localeCompare(b.deal.nom, "fr");
    }
    return (a.prochaineEcheanceDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.prochaineEcheanceDate?.getTime() ?? Number.MAX_SAFE_INTEGER)
      || a.deal.nom.localeCompare(b.deal.nom, "fr");
  });
  const dealsActifs = deals.filter(({ statut }) => statut !== "termine");
  const dealsTermines = deals.filter(({ statut }) => statut === "termine");
  const totalEngage = calculerCapitalEngageNet(deals.map(({ deal }) => deal));
  const dealsFiltres = dealsTries.filter(({ statut }) => {
    if (filtre === "actifs") return statut !== "termine";
    if (filtre === "termines") return statut === "termine";
    return true;
  });

  useEffect(() => {
    if (loading || restaurationEffectuee.current) return;
    restaurationEffectuee.current = true;
    let secondeFrame = 0;
    let restaurationDifferee: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      const restaurerDefilement = () => {
        window.scrollTo(0, etatRetour?.scrollY ?? 0);
        if (!etatRetour?.dealId) return;

        const cible = document.getElementById(`deal-card-${etatRetour.dealId}`);
        if (!cible) return;
        const margeHaute = 80;
        const margeBasse = window.innerHeight - 100;
        const rect = cible.getBoundingClientRect();
        if (rect.top < margeHaute || rect.bottom > margeBasse) {
          cible.scrollIntoView({ block: "center" });
        }
      };

      secondeFrame = window.requestAnimationFrame(() => {
        restaurerDefilement();
        if (etatRetour) {
          window.history.replaceState({ ...window.history.state, usr: null }, "", window.location.href);
          restaurationDifferee = window.setTimeout(restaurerDefilement, 100);
        }
      });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(secondeFrame);
      if (restaurationDifferee !== undefined) window.clearTimeout(restaurationDifferee);
    };
  }, [loading, deals.length, etatRetour]);

  function etatVue(dealId?: string): DealListViewState {
    return { scrollY: window.scrollY, filtre, tri, dealId };
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Chargement des deals...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-blue-500/10 bg-gradient-to-b from-slate-50 to-white p-4 pb-28 text-slate-900 shadow-sm dark:from-[#141d2e] dark:to-[#0e1422] dark:text-white">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-gray-500">Portefeuille</p>
          <h2 className="mt-1 text-xl font-semibold">Deals</h2>
        </div>
        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
          <div>{dealsActifs.length} actif{dealsActifs.length > 1 ? "s" : ""}</div>
          <div>{totalEngage.toLocaleString("fr-FR")} € engagés</div>
        </div>
      </div>
      {deals.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <label htmlFor="tri-deals" className="text-xs text-slate-500 dark:text-slate-400">Trier par</label>
            <select
              id="tri-deals"
              aria-label="Trier les deals"
              value={tri}
              onChange={(event) => {
                const valeur = event.target.value as TriDeals;
                setTri(valeur);
                localStorage.setItem(cleTri, valeur);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            >
              <option value="prochaineEcheance">Prochaine échéance</option>
              <option value="montant">Montant investi</option>
              <option value="dateFin">Date de fin</option>
            </select>
          </div>
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer les deals">
          {([
            ["actifs", `Actifs (${dealsActifs.length})`],
            ["termines", `Terminés (${dealsTermines.length})`],
            ["tous", `Tous (${deals.length})`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filtre === value}
              onClick={() => setFiltre(value)}
              className={
                "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors " +
                (filtre === value
                  ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white")
              }
            >
              {label}
            </button>
          ))}
          </div>
        </>
      )}
      {deals.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Aucun deal pour l'instant. Ajoutez-en un avec le bouton +.
        </div>
      ) : dealsFiltres.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Aucun deal dans ce filtre.</div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {dealsFiltres.map(({ deal, statut, dateFin, prochaineEcheanceDate, prochaineEcheanceMontant }) => (
            <DealCard
              key={deal.id}
              id={`deal-card-${deal.id}`}
              deal={deal}
              statut={statut}
              dateFin={dateFin}
              prochaineEcheanceDate={prochaineEcheanceDate}
              prochaineEcheanceMontant={prochaineEcheanceMontant}
              sourceDealName={deal.reinvestissement ? deals.find((candidate) => candidate.deal.id === deal.reinvestissement?.sourceDealId)?.deal.nom : undefined}
              onClick={() => onSelectDeal(deal.id, etatVue(deal.id))}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => onAjouterDeal(etatVue())}
        aria-label="Ajouter un deal"
        className="fixed bottom-24 right-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white shadow-lg transition-colors active:bg-emerald-700"
      >
        <Plus size={24} aria-hidden="true" />
      </button>
    </section>
  );
}
