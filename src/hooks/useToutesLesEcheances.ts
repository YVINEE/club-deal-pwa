import { useState, useEffect, useCallback } from "react";
import { db } from "../db/database";
import { Echeance } from "../types";

export interface EcheanceAvecDeal extends Echeance {
  nomDeal: string;
}

export function useToutesLesEcheances(refreshKey: number = 0) {
  const [echeances, setEcheances] = useState<EcheanceAvecDeal[]>([]);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const maintenant = new Date();
      const toutesEcheances = await db.echeances.where("date").aboveOrEqual(maintenant).sortBy("date");

      const dealIds = [...new Set(toutesEcheances.map((e) => e.dealId))];
      const deals = await db.deals.where("id").anyOf(dealIds).toArray();
      const nomsParId = new Map(deals.map((d) => [d.id, d.nom]));

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
