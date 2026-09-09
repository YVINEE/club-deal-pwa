import { useState, useEffect, useCallback } from "react";
import { Echeance } from "../types";
import { lirePortefeuille } from "../db/secureStorage";

export interface EcheanceAvecDeal extends Echeance {
  nomDeal: string;
}

export function useToutesLesEcheances(refreshKey: number = 0) {
  const [echeances, setEcheances] = useState<EcheanceAvecDeal[]>([]);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await lirePortefeuille();
      const toutesEcheances = [...data.echeances].sort((a, b) => a.date.getTime() - b.date.getTime());

      const dealIds = [...new Set(toutesEcheances.map((e) => e.dealId))];
      const nomsParId = new Map(data.deals.filter((deal) => dealIds.includes(deal.id)).map((deal) => [deal.id, deal.nom]));

      const enrichies = toutesEcheances.map((e) => ({
        ...e,
        nomDeal: nomsParId.get(e.dealId) ?? "Deal inconnu",
      }));

      setEcheances(enrichies);
    } catch (e) {
      console.error("Erreur lors du chargement des échéances à venir", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger, refreshKey]);

  return { echeances, loading };
}
