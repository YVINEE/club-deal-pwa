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
  const dealsTries = [...deals].sort((a, b) => {
    const dateA = a.prochaineEcheanceDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const dateB = b.prochaineEcheanceDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return dateA - dateB;
  });

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Chargement des deals...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="relative p-4">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500">Portefeuille</p>
        <h2 className="mt-1 text-xl font-semibold">Deals</h2>
      </div>
      {deals.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Aucun deal pour l'instant. Ajoutez-en un avec le bouton +.
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {dealsTries.map(({ deal, statut, dateFin, prochaineEcheanceDate, prochaineEcheanceMontant }) => (
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
    </div>
  );
}
