import { useState, useEffect, useRef, FormEvent, ReactNode } from "react";
import { Deal, Frequence } from "../types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculerCouponPourDate, DATE_CHANGEMENT_FISCALITE, dealEligibleEvolutionFiscale } from "../utils/calculs";
import { addMonths, frequenceEnMois } from "../utils/dateUtils";

interface DealFormProps {
  dealExistant?: Deal;
  onSubmit: (deal: Deal) => Promise<void>;
  onAnnuler: () => void;
}

interface FormState {
  nom: string;
  dateDebut: string;
  montant: string;
  rendementAnnuel: string;
  frequence: Frequence;
  dureeInitiale: string;
  nombreMaxProlongations: string;
  dureeProlongationMois: string;
  appliquerEvolutionFiscale: boolean;
  montantCouponApresEvolutionFiscale: string;
}

function dealVersFormState(deal?: Deal): FormState {
  return {
    nom: deal?.nom ?? "",
    dateDebut: deal ? deal.dateDebut.toISOString().slice(0, 10) : "",
    montant: deal ? String(deal.montant) : "",
    rendementAnnuel: deal ? String(deal.rendementAnnuel) : "",
    frequence: deal?.frequence ?? "trimestriel",
    dureeInitiale: deal ? String(deal.dureeInitiale) : "",
    nombreMaxProlongations: deal ? String(deal.nombreMaxProlongations) : "0",
    dureeProlongationMois: deal ? String(deal.dureeProlongationMois) : "",
    appliquerEvolutionFiscale: deal?.appliquerEvolutionFiscale === true,
    montantCouponApresEvolutionFiscale: deal?.montantCouponApresEvolutionFiscale !== undefined
      ? String(deal.montantCouponApresEvolutionFiscale)
      : "",
  };
}

export function DealForm({ dealExistant, onSubmit, onAnnuler }: DealFormProps) {
  const [form, setForm] = useState<FormState>(dealVersFormState(dealExistant));
  const [erreurs, setErreurs] = useState<Partial<Record<keyof FormState, string>>>({});
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const initialisationRef = useRef(true);
  const dateDebut = form.dateDebut ? new Date(form.dateDebut) : null;
  const evolutionFiscaleEligible = dateDebut && Number(form.dureeInitiale) > 0
    ? dealEligibleEvolutionFiscale(dateDebut, Number(form.dureeInitiale))
    : false;
  const datePremiereEcheance = dateDebut ? addMonths(dateDebut, frequenceEnMois(form.frequence)) : null;
  const couponEstime = dateDebut && datePremiereEcheance && Number(form.montant) > 0 && Number(form.rendementAnnuel) > 0
    ? calculerCouponPourDate(
        Number(form.montant),
        Number(form.rendementAnnuel),
        form.frequence,
        dateDebut,
        datePremiereEcheance,
        evolutionFiscaleEligible && form.appliquerEvolutionFiscale,
      )
    : null;
  const couponApresEvolutionPropose = dateDebut && Number(form.montant) > 0 && Number(form.rendementAnnuel) > 0
    ? calculerCouponPourDate(
        Number(form.montant),
        Number(form.rendementAnnuel),
        form.frequence,
        dateDebut,
        new Date(`${DATE_CHANGEMENT_FISCALITE}T00:00:00`),
        true,
      )
    : null;

  useEffect(() => {
    initialisationRef.current = true;
    setForm(dealVersFormState(dealExistant));
  }, [dealExistant]);

  useEffect(() => {
    if (!evolutionFiscaleEligible && form.appliquerEvolutionFiscale) {
      setForm((f) => ({ ...f, appliquerEvolutionFiscale: false }));
    }
  }, [evolutionFiscaleEligible, form.appliquerEvolutionFiscale]);

  useEffect(() => {
    if (initialisationRef.current) {
      initialisationRef.current = false;
      return;
    }
    setForm((f) => ({
      ...f,
      montantCouponApresEvolutionFiscale: evolutionFiscaleEligible && f.appliquerEvolutionFiscale && couponApresEvolutionPropose !== null
        ? String(couponApresEvolutionPropose)
        : "",
    }));
  }, [
    evolutionFiscaleEligible,
    form.appliquerEvolutionFiscale,
    form.dateDebut,
    form.montant,
    form.rendementAnnuel,
    form.frequence,
    form.dureeInitiale,
    couponApresEvolutionPropose,
  ]);

  function majChamp<K extends keyof FormState>(champ: K, valeur: FormState[K]) {
    setForm((f) => ({ ...f, [champ]: valeur }));
    setErreurs((e) => ({ ...e, [champ]: undefined }));
  }

  function valider(): boolean {
    const nouvellesErreurs: Partial<Record<keyof FormState, string>> = {};
    if (!form.nom.trim()) nouvellesErreurs.nom = "Le nom est requis";
    if (!form.dateDebut) nouvellesErreurs.dateDebut = "La date de début est requise";
    if (!form.montant || Number(form.montant) <= 0) nouvellesErreurs.montant = "Montant invalide";
    if (!form.rendementAnnuel || Number(form.rendementAnnuel) <= 0)
      nouvellesErreurs.rendementAnnuel = "Rendement invalide";
    if (!form.dureeInitiale || Number(form.dureeInitiale) <= 0) nouvellesErreurs.dureeInitiale = "Durée invalide";
    if (form.nombreMaxProlongations === "" || Number(form.nombreMaxProlongations) < 0)
      nouvellesErreurs.nombreMaxProlongations = "Valeur invalide";
    if (
      Number(form.nombreMaxProlongations) > 0 &&
      (!form.dureeProlongationMois || Number(form.dureeProlongationMois) <= 0)
    ) {
      nouvellesErreurs.dureeProlongationMois = "Durée de prolongation requise";
    }
    if (
      evolutionFiscaleEligible &&
      form.appliquerEvolutionFiscale &&
      (form.montantCouponApresEvolutionFiscale === "" ||
        !Number.isFinite(Number(form.montantCouponApresEvolutionFiscale)) ||
        Number(form.montantCouponApresEvolutionFiscale) < 0)
    ) {
      nouvellesErreurs.montantCouponApresEvolutionFiscale = "Montant de coupon invalide";
    }
    setErreurs(nouvellesErreurs);
    return Object.keys(nouvellesErreurs).length === 0;
  }

  async function gererSoumission(e: FormEvent) {
    e.preventDefault();
    if (!valider()) return;
    setEnvoiEnCours(true);
    try {
      const deal: Deal = {
        id: dealExistant?.id ?? crypto.randomUUID(),
        nom: form.nom.trim(),
        dateDebut: new Date(form.dateDebut),
        montant: Number(form.montant),
        rendementAnnuel: Number(form.rendementAnnuel),
        frequence: form.frequence,
        dureeInitiale: Number(form.dureeInitiale),
        nombreMaxProlongations: Number(form.nombreMaxProlongations),
        dureeProlongationMois: form.dureeProlongationMois ? Number(form.dureeProlongationMois) : 0,
        appliquerEvolutionFiscale: evolutionFiscaleEligible && form.appliquerEvolutionFiscale,
        montantCouponApresEvolutionFiscale: evolutionFiscaleEligible && form.appliquerEvolutionFiscale
          ? Number(form.montantCouponApresEvolutionFiscale)
          : undefined,
      };
      await onSubmit(deal);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <form onSubmit={gererSoumission} className="flex flex-col gap-5 p-4 pb-24 max-w-md mx-auto">
      <div className="sticky top-0 bg-background h-16 -mt-4 -mx-4 px-4 border-b relative flex items-center justify-center">
        <h2 className="text-lg font-semibold text-center">
          {dealExistant ? "Modifier le deal" : "Nouveau deal"}
        </h2>
      </div>

      <Champ label="Nom" erreur={erreurs.nom}>
        <Input value={form.nom} onChange={(e) => majChamp("nom", e.target.value)} className="h-12 text-base" />
      </Champ>

      <Champ label="Date de début" erreur={erreurs.dateDebut}>
        <Input
          type="date"
          lang="fr-FR"
          value={form.dateDebut}
          onChange={(e) => majChamp("dateDebut", e.target.value)}
          className="h-12 text-base"
        />
      </Champ>

      <Champ label="Montant (€)" erreur={erreurs.montant}>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={form.montant}
          onChange={(e) => majChamp("montant", e.target.value)}
          className="h-12 text-base"
        />
      </Champ>

      <Champ label="Rendement annuel (%)" erreur={erreurs.rendementAnnuel}>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={form.rendementAnnuel}
          onChange={(e) => majChamp("rendementAnnuel", e.target.value)}
          className="h-12 text-base"
        />
      </Champ>

      <Champ label="Fréquence des versements">
        <Select value={form.frequence} onValueChange={(v) => majChamp("frequence", v as Frequence)}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trimestriel">Trimestriel</SelectItem>
            <SelectItem value="semestriel">Semestriel</SelectItem>
          </SelectContent>
        </Select>
      </Champ>
      {couponEstime !== null && (
        <p className="-mt-3 text-sm text-emerald-600 dark:text-emerald-300">
          Coupon estimé : {couponEstime.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € par {form.frequence === "trimestriel" ? "trimestre" : "semestre"}
        </p>
      )}

      <Champ label="Durée initiale (mois)" erreur={erreurs.dureeInitiale}>
        <Input
          type="number"
          inputMode="numeric"
          min="1"
          value={form.dureeInitiale}
          onChange={(e) => majChamp("dureeInitiale", e.target.value)}
          className="h-12 text-base"
        />
      </Champ>

      <Champ label="Nombre max de prolongations" erreur={erreurs.nombreMaxProlongations}>
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          value={form.nombreMaxProlongations}
          onChange={(e) => majChamp("nombreMaxProlongations", e.target.value)}
          className="h-12 text-base"
        />
      </Champ>

      {Number(form.nombreMaxProlongations) > 0 && (
        <Champ label="Durée d'une prolongation (mois)" erreur={erreurs.dureeProlongationMois}>
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            value={form.dureeProlongationMois}
            onChange={(e) => majChamp("dureeProlongationMois", e.target.value)}
            className="h-12 text-base"
          />
        </Champ>
      )}

      {evolutionFiscaleEligible && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Appliquer l’évolution de la CSG de 2026</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.appliquerEvolutionFiscale}
              aria-label="Appliquer l’évolution de la CSG de 2026"
              onClick={() => majChamp("appliquerEvolutionFiscale", !form.appliquerEvolutionFiscale)}
              className={
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 " +
                (form.appliquerEvolutionFiscale ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700")
              }
            >
              <span
                aria-hidden="true"
                className={
                  "h-5 w-5 rounded-full bg-white shadow-sm transition-transform " +
                  (form.appliquerEvolutionFiscale ? "translate-x-5" : "translate-x-0")
                }
              />
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Les coupons à partir du 1er janvier 2026 seront ajustés selon le nouveau taux.
          </p>
          {form.appliquerEvolutionFiscale && (
            <Champ label="Montant du coupon après le 1er janvier 2026 (€)" erreur={erreurs.montantCouponApresEvolutionFiscale}>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.montantCouponApresEvolutionFiscale}
                aria-label="Montant du coupon après le 1er janvier 2026 (€)"
                onChange={(e) => majChamp("montantCouponApresEvolutionFiscale", e.target.value)}
                className="h-12 text-base"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Montant proposé après arrondi. Modifiez-le si votre promoteur applique un autre montant.
              </span>
            </Champ>
          )}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button type="button" variant="outline" onClick={onAnnuler} className="flex-1 h-12">
          Annuler
        </Button>
        <Button type="submit" disabled={envoiEnCours} className="flex-1 h-12">
          {envoiEnCours ? "Enregistrement..." : dealExistant ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

function Champ({ label, erreur, children }: { label: string; erreur?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {erreur && <span className="text-sm text-red-500">{erreur}</span>}
    </div>
  );
}
