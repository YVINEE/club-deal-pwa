import { Moon, Palette, Sun } from "lucide-react";
import { StorageMode } from "../db/secureStorage";
import { SecuritySettings } from "./SecuritySettings";

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
    <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-blue-500/10 bg-gradient-to-b from-slate-50 to-white p-4 pb-28 text-slate-900 shadow-sm dark:from-[#141d2e] dark:to-[#0e1422] dark:text-white">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Réglages données</p>
        <h2 className="mt-1 text-xl font-semibold">Paramètres</h2>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/5 dark:bg-[#111827]">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-emerald-600 dark:bg-white/5 dark:text-emerald-300">
            <Palette size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-semibold">Apparence &amp; thème</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Personnalisez l’affichage de l’application.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-[#0e1422]" role="radiogroup" aria-label="Thème de l’application">
          {(["dark", "light"] as const).map((option) => (
            <label
              key={option}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg p-2.5 text-sm transition-colors ${
                theme === option ? "bg-slate-200 dark:bg-white/10" : "hover:bg-slate-200/70 dark:hover:bg-white/5"
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={option}
                checked={theme === option}
                onChange={() => onThemeChange(option)}
                className="sr-only"
              />
              <span className={theme === option ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500"}>
                {option === "dark" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
              </span>
              <span className={theme === option ? "font-medium text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}>
                {option === "dark" ? "Sombre" : "Clair"}
              </span>
            </label>
          ))}
        </div>
      </section>

      <SecuritySettings {...securityProps} />
    </section>
  );
}
