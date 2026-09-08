import { useState } from "react";
import { useDeals } from "../hooks/useDeals";
import { DealCard } from "./DealCard";
import { ThemeToggle } from "./ThemeToggle";
import { SecuritySettings } from "./SecuritySettings";
import { Plus, Settings } from "lucide-react";

interface DealListProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  protectionActive: boolean;
  onActiverProtection: (pin: string) => Promise<void>;
  onModifierPin: (ancienPin: string, nouveauPin: string) => Promise<boolean>;
  onDesactiverProtection: (pin: string) => Promise<boolean>;
  onSelectDeal: (dealId: string) => void;
  onAjouterDeal: () => void;
}

export function DealList({
  theme,
  onToggleTheme,
  protectionActive,
  onActiverProtection,
  onModifierPin,
  onDesactiverProtection,
  onSelectDeal,
  onAjouterDeal,
}: DealListProps) {
  const { deals, loading, error } = useDeals();
  const [reglagesOuverts, setReglagesOuverts] = useState(false);

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Chargement des deals...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="relative min-h-screen pb-20">
      <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
          <h1 className="font-semibold text-base">Suivi Club Deals</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReglagesOuverts((ouvert) => !ouvert)}
            aria-label="Réglages"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background text-foreground"
          >
            <Settings size={20} aria-hidden="true" />
          </button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
      {reglagesOuverts && (
        <SecuritySettings
          protectionActive={protectionActive}
          onActiver={onActiverProtection}
          onModifier={onModifierPin}
          onDesactiver={onDesactiverProtection}
        />
      )}
      {deals.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Aucun deal pour l'instant. Ajoutez-en un avec le bouton +.
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {deals.map(({ deal, statut, dateFin, prochaineEcheanceDate, prochaineEcheanceMontant }) => (
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
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white text-2xl shadow-lg flex items-center justify-center active:bg-blue-700 transition-colors"
      >
        <Plus size={24} aria-hidden="true" />
      </button>
    </div>
  );
}
