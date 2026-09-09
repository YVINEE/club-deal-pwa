import { useState } from "react";
import { Database, Download, KeyRound, ListChecks, LockKeyhole, Upload } from "lucide-react";
import { StorageMode } from "../db/secureStorage";
import { motDePasseValide } from "../utils/crypto";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type ActionChiffrement = "activer" | "modifier" | "desactiver" | null;

interface SecuritySettingsProps {
  suiviEncaissementsActif: boolean;
  onToggleSuiviEncaissements: (actif: boolean) => void;
  storageMode: StorageMode;
  onActiverChiffrement: (motDePasse: string) => Promise<void>;
  onDesactiverChiffrement: (motDePasse: string) => Promise<void>;
  onChangerMotDePasse: (ancien: string, nouveau: string) => Promise<void>;
  onExporterJson: () => Promise<void>;
  onImporterJson: (file: File) => Promise<void>;
}

export function SecuritySettings({
  suiviEncaissementsActif,
  onToggleSuiviEncaissements,
  storageMode,
  onActiverChiffrement,
  onDesactiverChiffrement,
  onChangerMotDePasse,
  onExporterJson,
  onImporterJson,
}: SecuritySettingsProps) {
  const [actionChiffrement, setActionChiffrement] = useState<ActionChiffrement>(null);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [erreurChiffrement, setErreurChiffrement] = useState("");

  function reinitialiserChiffrement() {
    setMotDePasse("");
    setConfirmationMotDePasse("");
    setNouveauMotDePasse("");
    setErreurChiffrement("");
  }

  async function gererChiffrement() {
    setErreurChiffrement("");
    try {
      if (actionChiffrement === "activer") {
        if (!motDePasseValide(motDePasse) || motDePasse !== confirmationMotDePasse) {
          setErreurChiffrement("Le mot de passe doit contenir au moins 8 caractères identiques à la confirmation.");
          return;
        }
        await onActiverChiffrement(motDePasse);
      } else if (actionChiffrement === "modifier") {
        if (!motDePasse || !motDePasseValide(nouveauMotDePasse) || nouveauMotDePasse !== confirmationMotDePasse) {
          setErreurChiffrement("Le nouveau mot de passe doit contenir au moins 8 caractères identiques à la confirmation.");
          return;
        }
        await onChangerMotDePasse(motDePasse, nouveauMotDePasse);
      } else if (actionChiffrement === "desactiver") {
        if (!motDePasse) {
          setErreurChiffrement("Saisissez le mot de passe actuel.");
          return;
        }
        await onDesactiverChiffrement(motDePasse);
      }
      reinitialiserChiffrement();
      setActionChiffrement(null);
    } catch (error) {
      setErreurChiffrement(error instanceof Error ? error.message : "Opération impossible");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/5 dark:bg-[#111827]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-emerald-600 dark:bg-white/5 dark:text-emerald-300">
              <ListChecks size={17} aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold">Gestion du pointage</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Activez le pointage manuel des échéances échues.</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={suiviEncaissementsActif}
            aria-label="Activer le suivi des encaissements"
            onClick={() => onToggleSuiviEncaissements(!suiviEncaissementsActif)}
            className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#111827] ${
              suiviEncaissementsActif ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${suiviEncaissementsActif ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
        <p className="mt-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-400">
          Les échéances échues pourront être marquées comme encaissées depuis les écrans Échéances et Dashboard.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/5 dark:bg-[#111827]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-emerald-600 dark:bg-white/5 dark:text-emerald-300">
              <Database size={17} aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold">Stockage local &amp; Dexie</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Données conservées sur cet appareil.</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${storageMode === "encrypted" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"}`}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {storageMode === "encrypted" ? "Chiffrée" : "Non chiffrée"}
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
          {storageMode === "encrypted" ? "Base locale chiffrée par mot de passe." : "Base locale non chiffrée."}
        </p>

        {!actionChiffrement && (
          <div className="mt-4 space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActionChiffrement(storageMode === "encrypted" ? "desactiver" : "activer")}
              className="w-full justify-center gap-2"
            >
              {storageMode === "encrypted" ? <LockKeyhole size={16} aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}
              {storageMode === "encrypted" ? "Désactiver le chiffrement" : "Activer le chiffrement"}
            </Button>
            {storageMode === "encrypted" && (
              <Button type="button" variant="outline" onClick={() => setActionChiffrement("modifier")} className="w-full justify-center">
                Changer le mot de passe
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={onExporterJson} className="h-auto min-h-20 flex-col gap-1.5 py-3">
                <Download size={18} aria-hidden="true" />
                <span>Exporter JSON</span>
                <span className="text-[11px] font-normal text-slate-500">Sauvegarde locale</span>
              </Button>
              <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-3 text-center text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-white/5">
                <Upload size={18} aria-hidden="true" />
                <span>Importer JSON</span>
                <span className="text-[11px] font-normal text-slate-500">Restaurer un fichier</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onImporterJson(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {actionChiffrement && (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
            <Input
              type="password"
              autoComplete={actionChiffrement === "activer" ? "new-password" : "current-password"}
              placeholder="Mot de passe de chiffrement"
              value={motDePasse}
              onChange={(event) => setMotDePasse(event.target.value)}
              aria-label="Mot de passe de chiffrement"
            />
            {actionChiffrement === "activer" && (
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Confirmer le mot de passe"
                value={confirmationMotDePasse}
                onChange={(event) => setConfirmationMotDePasse(event.target.value)}
                aria-label="Confirmer le mot de passe"
              />
            )}
            {actionChiffrement === "modifier" && (
              <>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Nouveau mot de passe"
                  value={nouveauMotDePasse}
                  onChange={(event) => setNouveauMotDePasse(event.target.value)}
                  aria-label="Nouveau mot de passe"
                />
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirmer le nouveau mot de passe"
                  value={confirmationMotDePasse}
                  onChange={(event) => setConfirmationMotDePasse(event.target.value)}
                  aria-label="Confirmer le nouveau mot de passe"
                />
              </>
            )}
            {erreurChiffrement && <p className="text-sm text-red-500 dark:text-red-400" role="alert">{erreurChiffrement}</p>}
            <div className="flex gap-2">
              <Button type="button" onClick={gererChiffrement}>
                {actionChiffrement === "activer"
                  ? "Chiffrer la base"
                  : actionChiffrement === "modifier"
                    ? "Changer le mot de passe"
                    : "Déchiffrer la base"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { reinitialiserChiffrement(); setActionChiffrement(null); }}>
                Annuler
              </Button>
            </div>
            <p className="text-xs text-slate-500">Le mot de passe ne peut pas être récupéré.</p>
          </div>
        )}
      </section>
    </div>
  );
}
