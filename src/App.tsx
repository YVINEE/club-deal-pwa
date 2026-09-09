import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useDeals } from "./hooks/useDeals";
import { DealList } from "./components/DealList";
import { DealDetail } from "./components/DealDetail";
import { DealForm } from "./components/DealForm";
import { Deal } from "./types";
import { EncryptionLockScreen } from "./components/EncryptionLockScreen";
import { MainLayout } from "./components/MainLayout";
import { DashboardPage } from "./components/DashboardPage";
import { EcheancesPage } from "./components/EcheancesPage";
import { SettingsPage } from "./components/SettingsPage";
import {
  activerChiffrement,
  changerMotDePasseChiffrement,
  desactiverChiffrement,
  deverrouillerStockage,
  exporterJson,
  getStorageMode,
  importerJson,
  ouvrirStockage,
  StorageMode,
} from "./db/secureStorage";

type Theme = "light" | "dark";

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const themeEnregistre = localStorage.getItem("club-deal-theme");
    if (themeEnregistre === "light" || themeEnregistre === "dark") return themeEnregistre;
    return "dark";
  });
  const [suiviEncaissementsActif, setSuiviEncaissementsActif] = useState(
    () => localStorage.getItem("club-deal-suivi-encaissements") === "true"
  );
  const [storageMode, setStorageMode] = useState<StorageMode>(getStorageMode);
  const [stockagePret, setStockagePret] = useState(false);

  useEffect(() => {
    localStorage.removeItem("club-deal-security");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("club-deal-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("club-deal-suivi-encaissements", String(suiviEncaissementsActif));
  }, [suiviEncaissementsActif]);

  useEffect(() => {
    if (storageMode !== "plain") return;
    ouvrirStockage("plain").then(() => setStockagePret(true)).catch(() => setStockagePret(false));
  }, [storageMode]);

  async function deverrouillerBase(motDePasse: string): Promise<boolean> {
    try {
      await deverrouillerStockage(motDePasse);
      setStockagePret(true);
      return true;
    } catch {
      return false;
    }
  }

  async function activerBaseChiffree(motDePasse: string): Promise<void> {
    await activerChiffrement(motDePasse);
    setStorageMode("encrypted");
    setStockagePret(true);
  }

  async function desactiverBaseChiffree(motDePasse: string): Promise<void> {
    await desactiverChiffrement(motDePasse);
    setStorageMode("plain");
    setStockagePret(true);
  }

  async function changerMotDePasseBase(ancien: string, nouveau: string): Promise<void> {
    await changerMotDePasseChiffrement(ancien, nouveau);
  }

  async function telechargerJson(): Promise<void> {
    try {
      const contenu = await exporterJson();
      const blob = new Blob([contenu], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = "club-deal-sauvegarde.json";
      lien.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Export impossible");
    }
  }

  async function importerFichier(file: File): Promise<void> {
    try {
      const contenu = await file.text();
      const entete = JSON.parse(contenu) as { encrypted?: boolean };
      if (!window.confirm("Remplacer toutes les données locales par ce fichier ?")) return;
      const motDePasse = entete.encrypted ? window.prompt("Mot de passe du fichier JSON") ?? undefined : undefined;
      await importerJson(contenu, motDePasse);
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Import impossible");
    }
  }

  if (!stockagePret) {
    return (
      <>
        {storageMode === "encrypted" ? (
          <EncryptionLockScreen onUnlock={deverrouillerBase} />
        ) : (
          <main className="flex min-h-screen items-center justify-center text-sm text-gray-500">
            Chargement des données...
          </main>
        )}
      </>
    );
  }

  return (
    <>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route
              path="/"
              element={
                <DashboardPage
                  suiviEncaissementsActif={suiviEncaissementsActif}
                  storageMode={storageMode}
                />
              }
            />
            <Route
              path="/deals"
              element={<EcranListe />}
            />
            <Route path="/echeances" element={<EcheancesPage suiviEncaissementsActif={suiviEncaissementsActif} />} />
            <Route
              path="/parametres"
              element={
                <SettingsPage
                  theme={theme}
                  onThemeChange={setTheme}
                  suiviEncaissementsActif={suiviEncaissementsActif}
                  onToggleSuiviEncaissements={setSuiviEncaissementsActif}
                  storageMode={storageMode}
                  onActiverChiffrement={activerBaseChiffree}
                  onDesactiverChiffrement={desactiverBaseChiffree}
                  onChangerMotDePasse={changerMotDePasseBase}
                  onExporterJson={telechargerJson}
                  onImporterJson={importerFichier}
                />
              }
            />
          </Route>
          <Route
            path="/deal/:dealId"
            element={
              <EcranDetail
                suiviEncaissementsActif={suiviEncaissementsActif}
              />
            }
          />
          <Route path="/nouveau" element={<EcranFormulaire />} />
          <Route
            path="/deal/:dealId/modifier"
            element={<EcranFormulaire />}
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

function EcranListe() {
  const navigate = useNavigate();
  return (
    <DealList
      onSelectDeal={(dealId) => navigate(`/deal/${dealId}`)}
      onAjouterDeal={() => navigate("/nouveau")}
    />
  );
}

function EcranDetail({
  suiviEncaissementsActif,
}: {
  suiviEncaissementsActif: boolean;
}) {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  if (!dealId) return null;

  return (
    <DealDetail
      dealId={dealId}
      suiviEncaissementsActif={suiviEncaissementsActif}
      onRetour={() => navigate("/")}
      onModifier={() => navigate(`/deal/${dealId}/modifier`)}
    />
  );
}

function EcranFormulaire() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const { deals, creer, modifier } = useDeals();

  const dealExistant = dealId ? deals.find((d) => d.deal.id === dealId)?.deal : undefined;

  async function gererSoumission(deal: Deal) {
    if (dealExistant) {
      await modifier(deal);
      navigate(`/deal/${deal.id}`);
    } else {
      await creer(deal);
      navigate("/");
    }
  }

  return (
    <DealForm
      dealExistant={dealExistant}
      onSubmit={gererSoumission}
      onAnnuler={() => navigate(dealExistant ? `/deal/${dealExistant.id}` : "/")}
    />
  );
}
