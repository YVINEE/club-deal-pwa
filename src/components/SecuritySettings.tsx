import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { pinValide } from "../utils/pinUtils";

type ActionProtection = "activer" | "modifier" | "desactiver" | null;

interface SecuritySettingsProps {
  protectionActive: boolean;
  suiviEncaissementsActif: boolean;
  onToggleSuiviEncaissements: (actif: boolean) => void;
  onActiver: (pin: string) => Promise<void>;
  onModifier: (ancienPin: string, nouveauPin: string) => Promise<boolean>;
  onDesactiver: (pin: string) => Promise<boolean>;
}

export function SecuritySettings({
  protectionActive,
  suiviEncaissementsActif,
  onToggleSuiviEncaissements,
  onActiver,
  onModifier,
  onDesactiver,
}: SecuritySettingsProps) {
  const [action, setAction] = useState<ActionProtection>(protectionActive ? null : "activer");
  const [pin, setPin] = useState("");
  const [nouveauPin, setNouveauPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");

  function reinitialiser() {
    setPin("");
    setNouveauPin("");
    setConfirmation("");
    setErreur("");
  }

  async function gererAction() {
    setErreur("");
    if (action === "activer") {
      if (!pinValide(pin) || pin !== confirmation) {
        setErreur("Le PIN doit contenir 6 chiffres identiques.");
        return;
      }
      await onActiver(pin);
      reinitialiser();
      setAction(null);
      return;
    }

    if (action === "modifier") {
      if (!pinValide(nouveauPin) || nouveauPin !== confirmation) {
        setErreur("Le nouveau PIN doit contenir 6 chiffres identiques.");
        return;
      }
      if (!(await onModifier(pin, nouveauPin))) {
        setErreur("PIN actuel incorrect.");
        return;
      }
      reinitialiser();
      setAction(null);
      return;
    }

    if (action === "desactiver") {
      if (!(await onDesactiver(pin))) {
        setErreur("PIN incorrect.");
        return;
      }
      reinitialiser();
      setAction("activer");
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
        <h2 className="font-semibold">Protection par PIN</h2>
        <p className="text-sm text-gray-500">
          {protectionActive ? "Protection activée." : "Protégez l’accès à l’application."}
        </p>
      </div>

      {!action && protectionActive && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setAction("modifier")}>
            Modifier le PIN
          </Button>
          <Button type="button" variant="outline" onClick={() => setAction("desactiver")}>
            Désactiver
          </Button>
        </div>
      )}

      {action && (
        <div className="space-y-3">
          {(action === "modifier" || action === "desactiver") && (
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN actuel"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              aria-label="PIN actuel"
            />
          )}
          {action !== "desactiver" && (
            <>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder={action === "modifier" ? "Nouveau PIN" : "PIN"}
                value={action === "modifier" ? nouveauPin : pin}
                onChange={(event) =>
                  (action === "modifier" ? setNouveauPin : setPin)(event.target.value.replace(/\D/g, ""))
                }
                aria-label={action === "modifier" ? "Nouveau PIN" : "PIN"}
              />
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Confirmer le PIN"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, ""))}
                aria-label="Confirmer le PIN"
              />
            </>
          )}
          {erreur && <p className="text-sm text-red-500" role="alert">{erreur}</p>}
          <div className="flex gap-2">
            <Button type="button" onClick={gererAction}>
              {action === "activer" ? "Activer" : action === "modifier" ? "Modifier" : "Désactiver"}
            </Button>
            {protectionActive && (
              <Button type="button" variant="outline" onClick={() => { reinitialiser(); setAction(null); }}>
                Annuler
              </Button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        En cas d’oubli, le PIN ne peut pas être récupéré dans l’application.
      </p>
    </section>
  );
}
