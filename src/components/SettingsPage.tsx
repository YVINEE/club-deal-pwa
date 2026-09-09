import { SecuritySettings } from "./SecuritySettings";
import { StorageMode } from "../db/secureStorage";

interface SettingsPageProps {
  suiviEncaissementsActif: boolean;
  onToggleSuiviEncaissements: (actif: boolean) => void;
  storageMode: StorageMode;
  onActiverChiffrement: (motDePasse: string) => Promise<void>;
  onDesactiverChiffrement: (motDePasse: string) => Promise<void>;
  onChangerMotDePasse: (ancien: string, nouveau: string) => Promise<void>;
  onExporterJson: () => Promise<void>;
  onImporterJson: (file: File) => Promise<void>;
}

export function SettingsPage(props: SettingsPageProps) {
  return <SecuritySettings {...props} />;
}
