import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { StorageMode } from "../db/secureStorage";
import { motDePasseValide } from "../utils/crypto";

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
    <section className="border-b bg-background p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Suivi des encaissements</h2>
          <p className="text-sm text-gray-500">
            Activez le pointage manuel des échéances échues.
          </p>
        </div>
        <input
          type="checkbox"
          checked={suiviEncaissementsActif}
          onChange={(event) => onToggleSuiviEncaissements(event.target.checked)}
          aria-label="Activer le suivi des encaissements"
          className="mt-1 h-5 w-5 accent-emerald-600"
        />
      </div>

      <div>
        <h2 className="font-semibold">Stockage local</h2>
        <p className="text-sm text-gray-500">
          {storageMode === "encrypted" ? "Base locale chiffrée par mot de passe." : "Base locale non chiffrée."}
        </p>
      </div>

      {!actionChiffrement && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setActionChiffrement(storageMode === "encrypted" ? "desactiver" : "activer")}
          >
            {storageMode === "encrypted" ? "Désactiver le chiffrement" : "Activer le chiffrement"}
          </Button>
          {storageMode === "encrypted" && (
            <Button type="button" variant="outline" onClick={() => setActionChiffrement("modifier")}>
              Changer le mot de passe
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onExporterJson}>
            Exporter JSON
          </Button>
          <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-border px-4 text-sm font-medium">
            Importer JSON
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
      )}

      {actionChiffrement && (
        <div className="space-y-3 rounded-lg border border-border p-3">
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
          {erreurChiffrement && <p className="text-sm text-red-500" role="alert">{erreurChiffrement}</p>}
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
          <p className="text-xs text-gray-500">Le mot de passe ne peut pas être récupéré.</p>
        </div>
      )}

    </section>
  );
}
