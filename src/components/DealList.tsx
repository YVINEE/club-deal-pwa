import { useState } from "react";
import { useDeals } from "../hooks/useDeals";
import { DealCard } from "./DealCard";
import { Plus } from "lucide-react";

interface DealListProps {
  onSelectDeal: (dealId: string) => void;
  onAjouterDeal: () => void;
}

export function DealList({
  onSelectDeal,
  onAjouterDeal,
}: DealListProps) {
  const { deals, loading, error } = useDeals();
  const [filtre, setFiltre] = useState<"tous" | "actifs" | "prolongation">("tous");
  const dealsTries = [...deals].sort((a, b) => {
    const dateA = a.prochaineEcheanceDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const dateB = b.prochaineEcheanceDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return dateA - dateB;
  });
  const dealsActifs = deals.filter(({ statut }) => statut !== "termine");
  const dealsEnProlongation = deals.filter(({ statut }) => statut === "enProlongation");
  const totalEngage = dealsActifs.reduce((total, { deal }) => total + deal.montant, 0);
  const dealsFiltres = dealsTries.filter(({ statut }) => {
    if (filtre === "actifs") return statut === "actif";
    if (filtre === "prolongation") return statut === "enProlongation";
    return true;
  });

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Chargement des deals...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-blue-500/10 bg-gradient-to-b from-[#141d2e] to-[#0e1422] p-4 pb-28 text-white shadow-sm">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500">Portefeuille</p>
          <h2 className="mt-1 text-xl font-semibold">Deals</h2>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>{dealsActifs.length} actif{dealsActifs.length > 1 ? "s" : ""}</div>
          <div>{totalEngage.toLocaleString("fr-FR")} € engagés</div>
        </div>
      </div>
      {deals.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer les deals">
          {([
            ["tous", `Tous (${deals.length})`],
            ["actifs", `Actifs (${deals.filter(({ statut }) => statut === "actif").length})`],
            ["prolongation", `En prolongation (${dealsEnProlongation.length})`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filtre === value}
              onClick={() => setFiltre(value)}
              className={
                "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors " +
                (filtre === value
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white")
              }
            >
              {label}
            </button>
          ))}
        </div>
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
              deal={deal}
              statut={statut}
              dateFin={dateFin}
              prochaineEcheanceDate={prochaineEcheanceDate}
              prochaineEcheanceMontant={prochaineEcheanceMontant}
              onClick={() => onSelectDeal(deal.id)}
            />
          ))}
        </div>
      )}

      <button
        onClick={onAjouterDeal}
        aria-label="Ajouter un deal"
        className="fixed bottom-24 right-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white shadow-lg transition-colors active:bg-emerald-700"
      >
        <Plus size={24} aria-hidden="true" />
      </button>
    </section>
  );
}
