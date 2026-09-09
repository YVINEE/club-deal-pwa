import { useState, useEffect, useCallback } from "react";
import { Prolongation } from "../types";
import { lirePortefeuille } from "../db/secureStorage";
import { prolongerDeal } from "../db/repositories";

export function useProlongations(dealId: string) {
  const [prolongations, setProlongations] = useState<Prolongation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const result = (await lirePortefeuille()).prolongations
        .filter((prolongation) => prolongation.dealId === dealId)
        .sort((a, b) => a.ordre - b.ordre);
      setProlongations(result);
    } catch (e) {
      console.error("Erreur lors du chargement des prolongations", e);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const prolonger = useCallback(async () => {
    setError(null);
    try {
      await prolongerDeal(dealId);
      await charger();
      setRefreshKey((k) => k + 1); // signal pour useEcheances
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la prolongation");
      console.error(e);
    }
  }, [dealId, charger]);

  return { prolongations, loading, error, prolonger, refreshKey };
}
