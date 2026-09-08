import { useState, useEffect, useCallback } from "react";
import { Deal, Prolongation, StatutDeal } from "../types";
import { ajouterDeal, modifierDeal, supprimerDeal, getDealsAvecEcheances } from "../db/repositories";
import { calculerStatut, dateFinCourante } from "../utils/statusUtils";

export interface DealAvecStatut {
  deal: Deal;
  prolongations: Prolongation[];
  statut: StatutDeal;
  dateFin: Date;
  prochaineEcheanceDate?: Date;
  prochaineEcheanceMontant?: number;
}

export function useDeals() {
  const [deals, setDeals] = useState<DealAvecStatut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    setLoading(true);
    try {
      const dealsAvecEcheances = await getDealsAvecEcheances();
      const maintenant = new Date();

      const enrichis = dealsAvecEcheances.map(({ deal, prolongations, echeances }) => {
        const prochaine = echeances.find((e) => e.date >= maintenant);
        return {
          deal,
          prolongations,
          statut: calculerStatut(deal, prolongations),
          dateFin: dateFinCourante(deal, prolongations),
          prochaineEcheanceDate: prochaine?.date,
          prochaineEcheanceMontant: prochaine?.montant,
        };
      });

      setDeals(enrichis);
      setError(null);
    } catch (e) {
      setError("Erreur lors du chargement des deals");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  const creer = useCallback(
    async (deal: Deal) => {
      try {
        await ajouterDeal(deal);
        await rafraichir();
      } catch (e) {
        setError("Erreur lors de la création du deal");
        console.error(e);
      }
    },
    [rafraichir]
  );

  const modifier = useCallback(
    async (deal: Deal) => {
      try {
        await modifierDeal(deal);
        await rafraichir();
      } catch (e) {
        setError("Erreur lors de la modification du deal");
        console.error(e);
      }
    },
    [rafraichir]
  );

  const supprimer = useCallback(
    async (dealId: string) => {
      try {
        await supprimerDeal(dealId);
        await rafraichir();
      } catch (e) {
        setError("Erreur lors de la suppression du deal");
        console.error(e);
      }
    },
    [rafraichir]
  );

  return { deals, loading, error, creer, modifier, supprimer, rafraichir };
}
