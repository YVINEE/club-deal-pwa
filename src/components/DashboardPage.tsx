import { useDeals } from "../hooks/useDeals";
import { marquerEcheanceEncaissee } from "../db/repositories";
import { Dashboard } from "./Dashboard";
import { StorageMode } from "../db/secureStorage";

interface DashboardPageProps {
  suiviEncaissementsActif: boolean;
  storageMode: StorageMode;
}

export function DashboardPage({ suiviEncaissementsActif, storageMode }: DashboardPageProps) {
  const { deals, loading, error, rafraichir } = useDeals();

  if (loading) return <div className="p-4 text-center text-gray-500">Chargement du tableau de bord...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  return (
    <Dashboard
      deals={deals}
      suiviEncaissementsActif={suiviEncaissementsActif}
      onPointer={async (echeanceId) => {
        await marquerEcheanceEncaissee(echeanceId);
        await rafraichir();
      }}
      storageMode={storageMode}
    />
  );
}
