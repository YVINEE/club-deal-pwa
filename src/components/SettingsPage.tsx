import { SecuritySettings } from "./SecuritySettings";
import { StorageMode } from "../db/secureStorage";

type Theme = "light" | "dark";

interface SettingsPageProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  suiviEncaissementsActif: boolean;
  onToggleSuiviEncaissements: (actif: boolean) => void;
  storageMode: StorageMode;
  onActiverChiffrement: (motDePasse: string) => Promise<void>;
  onDesactiverChiffrement: (motDePasse: string) => Promise<void>;
  onChangerMotDePasse: (ancien: string, nouveau: string) => Promise<void>;
  onExporterJson: () => Promise<void>;
  onImporterJson: (file: File) => Promise<void>;
}

export function SettingsPage({ theme, onThemeChange, ...securityProps }: SettingsPageProps) {
  return (
    <div>
      <section className="border-b bg-background p-4">
        <h2 className="font-semibold">Apparence</h2>
        <p className="mt-1 text-sm text-gray-500">Choisissez le thème de l’application.</p>
        <div className="mt-3 space-y-2" role="radiogroup" aria-label="Thème de l’application">
          {(["dark", "light"] as const).map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
              <input
                type="radio"
                name="theme"
                value={option}
                checked={theme === option}
                onChange={() => onThemeChange(option)}
                className="h-4 w-4 accent-emerald-600"
              />
              <span>{option === "dark" ? "Thème sombre" : "Thème clair"}</span>
            </label>
          ))}
        </div>
      </section>
      <SecuritySettings {...securityProps} />
    </div>
  );
}
