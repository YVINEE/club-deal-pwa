import { useState } from "react";
import { useDeals } from "../hooks/useDeals";
import { useEcheances } from "../hooks/useEcheances";
import { useProlongations } from "../hooks/useProlongations";
import { EcheancesTab } from "./EcheancesTab";
import { ProlongationsTab } from "./ProlongationsTab";
import { ExportTab } from "./ExportTab";
import { ThemeToggle } from "./ThemeToggle";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { annulerEcheanceEncaissee, marquerEcheanceEncaissee } from "../db/repositories";
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
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onRetour: () => void;
  onModifier: () => void;
  suiviEncaissementsActif: boolean;
}

export function DealDetail({
  dealId,
  theme,
  onToggleTheme,
  onRetour,
  onModifier,
  suiviEncaissementsActif,
}: DealDetailProps) {
  const { deals, supprimer } = useDeals();
  const dealInfo = deals.find((d) => d.deal.id === dealId);

  const { prolongations, prolonger, error: erreurProlongation, refreshKey } = useProlongations(dealId);
  const { echeances, loading: chargementEcheances, rafraichir: rafraichirEcheances } = useEcheances(dealId, refreshKey);

  const [onglet, setOnglet] = useState<Onglet>("echeances");
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);

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
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button onClick={onModifier} aria-label="Modifier" className="p-2">
            <Pencil size={18} aria-hidden="true" />
          </button>
          <button onClick={() => setConfirmationSuppression(true)} aria-label="Supprimer" className="p-2">
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <div className="text-2xl font-semibold">{deal.montant.toLocaleString("fr-FR")} €</div>
        <div className="text-sm text-gray-500">
          {deal.rendementAnnuel}% / an — {deal.frequence}
        </div>
      </div>

      <div className="p-4">
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
    </div>
  );
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
