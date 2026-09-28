import { useNavigate } from "react-router-dom";
import { useDeals } from "../hooks/useDeals";
import { marquerEcheanceEncaissee } from "../db/repositories";
import { Dashboard } from "./Dashboard";

interface DashboardPageProps {
  suiviEncaissementsActif: boolean;
}

export function DashboardPage({ suiviEncaissementsActif }: DashboardPageProps) {
  const { deals, loading, error, rafraichir } = useDeals();
  const navigate = useNavigate();

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
      onAjouterDeal={() => navigate("/nouveau")}
    />
  );
}
