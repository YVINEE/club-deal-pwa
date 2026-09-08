import { FormEvent, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { pinValide } from "../utils/pinUtils";

interface PinLockScreenProps {
  onUnlock: (pin: string) => Promise<boolean>;
}

export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function gererSoumission(event: FormEvent) {
    event.preventDefault();
    if (!pinValide(pin)) {
      setErreur("Saisissez un PIN de 6 chiffres.");
      return;
    }

    setChargement(true);
    const valide = await onUnlock(pin);
    setChargement(false);
    if (!valide) {
      setPin("");
      setErreur("PIN incorrect.");
    }
  }

  return (
    <main className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={gererSoumission} className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">Application verrouillée</h1>
        <p className="text-sm text-gray-500">Saisissez votre PIN pour continuer.</p>
        <Input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoFocus
          autoComplete="one-time-code"
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, ""));
            setErreur("");
          }}
          aria-label="PIN"
        />
        {erreur && <p className="text-sm text-red-500" role="alert">{erreur}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={chargement}>
          {chargement ? "Vérification..." : "Déverrouiller"}
        </Button>
      </form>
    </main>
  );
}
