import { useMemo, useState } from "react";
import { useDeals } from "../hooks/useDeals";
import { useEcheances } from "../hooks/useEcheances";
import { useProlongations } from "../hooks/useProlongations";
import { Deal } from "../types";
import { EcheancesTab } from "./EcheancesTab";
import { ProlongationsTab } from "./ProlongationsTab";
import { ExportTab } from "./ExportTab";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { annulerEcheanceEncaissee, marquerEcheanceEncaissee } from "../db/repositories";
import { calculerSyntheseDashboard } from "../utils/dashboard";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type Onglet = "echeances" | "prolongations" | "exporter";

interface DealDetailProps {
  dealId: string;
  onRetour: () => void;
  onModifier: () => void;
  suiviEncaissementsActif: boolean;
}

export function DealDetail({
  dealId,
  onRetour,
  onModifier,
  suiviEncaissementsActif,
}: DealDetailProps) {
  const { deals, supprimer } = useDeals();
  const dealInfo = deals.find((d) => d.deal.id === dealId);

  const { prolongations, prolonger, annulerDerniere, error: erreurProlongation, refreshKey } = useProlongations(dealId);
  const { echeances, loading: chargementEcheances, rafraichir: rafraichirEcheances } = useEcheances(dealId, refreshKey);
  const synthese = useMemo(
    () =>
      dealInfo
        ? calculerSyntheseDashboard(
            [{ deal: dealInfo.deal, echeances }],
            new Date(),
            { suiviEncaissements: suiviEncaissementsActif },
          )
        : null,
    [dealInfo, echeances, suiviEncaissementsActif],
  );

  const [onglet, setOnglet] = useState<Onglet>("echeances");
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const [confirmationAnnulation, setConfirmationAnnulation] = useState(false);

  if (!dealInfo) {
    return <div className="p-4 text-center text-gray-500">Deal introuvable</div>;
  }

  const { deal, statut } = dealInfo;

  async function gererSuppression() {
    await supprimer(dealId);
    setConfirmationSuppression(false);
    onRetour();
  }

  async function pointerEcheance(echeanceId: string) {
    await marquerEcheanceEncaissee(echeanceId);
    await rafraichirEcheances();
  }

  async function depointerEcheance(echeanceId: string) {
    await annulerEcheanceEncaissee(echeanceId);
    await rafraichirEcheances();
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between z-10">
        <button onClick={onRetour} aria-label="Retour" className="p-2 -ml-2">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <h1 className="font-semibold text-base truncate flex-1 text-center px-2">{deal.nom}</h1>
        <div className="flex gap-1">
          <button onClick={onModifier} aria-label="Modifier" className="p-2">
            <Pencil size={18} aria-hidden="true" />
          </button>
          <button onClick={() => setConfirmationSuppression(true)} aria-label="Supprimer" className="p-2">
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        {synthese && <ValeurActuelle deal={deal} synthese={synthese} />}
      </div>

      <div className="p-4">
        {synthese && !chargementEcheances && <ResumeFinancier synthese={synthese} />}
        {onglet === "echeances" && (
          <EcheancesTab
            echeances={echeances}
            loading={chargementEcheances}
            suiviEncaissementsActif={suiviEncaissementsActif}
            onPointer={pointerEcheance}
            onUnpointer={depointerEcheance}
          />
        )}
        {onglet === "prolongations" && (
          <ProlongationsTab
            deal={deal}
            prolongations={prolongations}
            statut={statut}
            onProlonger={prolonger}
            onAnnuler={() => setConfirmationAnnulation(true)}
            erreur={erreurProlongation}
          />
        )}
        {onglet === "exporter" && <ExportTab deal={deal} echeances={echeances} />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t flex pb-[env(safe-area-inset-bottom)]">
        <OngletBouton actif={onglet === "echeances"} onClick={() => setOnglet("echeances")} label="Échéances" />
        <OngletBouton
          actif={onglet === "prolongations"}
          onClick={() => setOnglet("prolongations")}
          label="Prolongations"
        />
        <OngletBouton actif={onglet === "exporter"} onClick={() => setOnglet("exporter")} label="Exporter" />
      </nav>

      <AlertDialog open={confirmationSuppression} onOpenChange={setConfirmationSuppression}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce deal ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera "{deal.nom}" ainsi que toutes ses échéances et prolongations. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={gererSuppression} className="bg-red-600 text-white">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmationAnnulation} onOpenChange={setConfirmationAnnulation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la dernière prolongation ?</AlertDialogTitle>
            <AlertDialogDescription>
              La dernière prolongation sera supprimée. Ses échéances seront recalculées et les éventuels pointages
              associés à ces échéances seront perdus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conserver</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await annulerDerniere();
                setConfirmationAnnulation(false);
              }}
              className="bg-red-600 text-white"
            >
              Annuler la prolongation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResumeFinancier({
  synthese,
}: {
  synthese: ReturnType<typeof calculerSyntheseDashboard>;
}) {
  return (
    <section aria-label="Résumé financier du deal" className="mb-4 grid grid-cols-2 gap-3">
      <IndicateurFinancier label="Capital investi" valeur={formatMontant(synthese.totalInvesti)} />
      <IndicateurFinancier label="Gains acquis" valeur={formatMontant(synthese.interetsAcquis)} couleur="text-emerald-600 dark:text-emerald-300" />
      <IndicateurFinancier label="Gains futurs" valeur={formatMontant(synthese.interetsFuturs)} couleur="text-emerald-600 dark:text-emerald-300" />
      <IndicateurFinancier label="Total final prévu" valeur={formatMontant(synthese.totalFinal)} couleur="text-purple-600 dark:text-purple-300" />
    </section>
  );
}

function ValeurActuelle({
  deal,
  synthese,
}: {
  deal: Deal;
  synthese: ReturnType<typeof calculerSyntheseDashboard>;
}) {
  return (
    <section aria-label="Valeur actuelle du deal" className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-black/10">
      <div className="text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Valeur actuelle</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{formatMontant(synthese.totalActuel)}</div>
      <div className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        {synthese.performanceBrute > 0 ? "+" : ""}{formatPourcentage(synthese.performanceBrute)}
      </div>
      <div className="mt-1 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
        Rendement : {formatPourcentage(deal.rendementAnnuel)} / an · {deal.frequence === "trimestriel" ? "Trimestriel" : "Semestriel"}
      </div>
    </section>
  );
}

function IndicateurFinancier({ label, valeur, couleur = "text-slate-900 dark:text-white" }: { label: string; valeur: string; couleur?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-white/5 dark:bg-[#1a2234]">
      <div className="text-[11px] uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className={"mt-1 text-base font-semibold tabular-nums " + couleur}>{valeur}</div>
    </div>
  );
}

function formatMontant(valeur: number): string {
  return valeur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatPourcentage(valeur: number): string {
  return valeur.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " %";
}

function OngletBouton({ actif, onClick, label }: { actif: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-medium ${
        actif ? "text-blue-600 border-t-2 border-blue-600" : "text-gray-500"
      }`}
    >
      {label}
    </button>
  );
}
