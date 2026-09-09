import { useState, useEffect, useCallback } from "react";
import { Echeance } from "../types";
import { db } from "../db/database";

export function useEcheances(dealId: string, refreshKey: number = 0) {
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const result = await db.echeances.where("dealId").equals(dealId).sortBy("date");
      setEcheances(result);
    } catch (e) {
      console.error("Erreur lors du chargement des échéances", e);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    charger();
    // refreshKey force un rechargement quand une prolongation est ajoutée ailleurs
  }, [charger, refreshKey]);

  return { echeances, loading, rafraichir: charger };
}
