import { FormEvent, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface EncryptionLockScreenProps {
  onUnlock: (motDePasse: string) => Promise<boolean>;
}

export function EncryptionLockScreen({ onUnlock }: EncryptionLockScreenProps) {
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function soumettre(event: FormEvent) {
    event.preventDefault();
    setErreur("");
    setChargement(true);
    const valide = await onUnlock(motDePasse);
    setChargement(false);
    if (!valide) {
      setMotDePasse("");
      setErreur("Mot de passe incorrect ou coffre invalide.");
    }
  }

  return (
    <main className="fixed inset-0 z-40 flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={soumettre} className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">Base locale chiffrée</h1>
        <p className="text-sm text-gray-500">Saisissez le mot de passe de chiffrement pour continuer.</p>
        <Input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={motDePasse}
          onChange={(event) => {
            setMotDePasse(event.target.value);
            setErreur("");
          }}
          aria-label="Mot de passe de chiffrement"
        />
        {erreur && <p className="text-sm text-red-500" role="alert">{erreur}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={chargement || motDePasse.length === 0}>
          {chargement ? "Déverrouillage..." : "Déverrouiller"}
        </Button>
      </form>
    </main>
  );
}
