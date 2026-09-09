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
  lirePortefeuille,
  ouvrirStockage,
  verrouillerStockage,
  StorageMode,
} from "./db/secureStorage";
import {
  demanderPermissionNotifications,
  enregistrerPreferenceNotifications,
  notificationsDisponibles,
  notificationsEcheancesActivees,
  notifierEcheancesDuJour,
} from "./utils/notifications";

type Theme = "light" | "dark";
const DUREE_VERROUILLAGE_MS = 60_000;

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
  const [notificationsActives, setNotificationsActives] = useState(
    () => notificationsDisponibles() && notificationsEcheancesActivees() && Notification.permission !== "denied",
  );

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

  useEffect(() => {
    if (storageMode !== "encrypted" || !stockagePret) return;

    let cacheEnArrierePlanDepuis: number | null = null;
    let timer: number | undefined;

    const annulerTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };
    const verrouiller = () => {
      verrouillerStockage();
      setStockagePret(false);
    };
    const verifierExpiration = () => {
      if (cacheEnArrierePlanDepuis !== null && Date.now() - cacheEnArrierePlanDepuis >= DUREE_VERROUILLAGE_MS) {
        verrouiller();
      }
    };
    const gererVisibilite = () => {
      if (document.visibilityState === "hidden") {
        cacheEnArrierePlanDepuis = Date.now();
        annulerTimer();
        timer = window.setTimeout(verrouiller, DUREE_VERROUILLAGE_MS);
        return;
      }

      annulerTimer();
      verifierExpiration();
      cacheEnArrierePlanDepuis = null;
    };

    document.addEventListener("visibilitychange", gererVisibilite);
    return () => {
      annulerTimer();
      document.removeEventListener("visibilitychange", gererVisibilite);
    };
  }, [stockagePret, storageMode]);

  useEffect(() => {
    if (!stockagePret || !notificationsActives) return;

    let annule = false;
    const verifier = async () => {
      try {
        const data = await lirePortefeuille();
        if (annule) return;
        const nomsParDeal = new Map(data.deals.map((deal) => [deal.id, deal.nom]));
        notifierEcheancesDuJour(data.echeances, nomsParDeal);
      } catch {
        // Le stockage peut être verrouillé entre deux changements d’onglet.
      }
    };
    const auRetour = () => {
      if (document.visibilityState === "visible") void verifier();
    };

    void verifier();
    document.addEventListener("visibilitychange", auRetour);
    window.addEventListener("focus", auRetour);
    return () => {
      annule = true;
      document.removeEventListener("visibilitychange", auRetour);
      window.removeEventListener("focus", auRetour);
    };
  }, [notificationsActives, stockagePret]);

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

  async function toggleNotificationsActives(actives: boolean): Promise<void> {
    if (!actives) {
      enregistrerPreferenceNotifications(false);
      setNotificationsActives(false);
      return;
    }

    const autorisees = await demanderPermissionNotifications();
    if (!autorisees) {
      enregistrerPreferenceNotifications(false);
      setNotificationsActives(false);
      window.alert("Les notifications sont indisponibles ou ont été refusées dans le navigateur.");
      return;
    }
    enregistrerPreferenceNotifications(true);
    setNotificationsActives(true);
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
                  notificationsActives={notificationsActives}
                  onToggleNotifications={toggleNotificationsActives}
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
      onRetour={() => navigate("/deals")}
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
      navigate("/deals");
    } else {
      await creer(deal);
      navigate("/deals");
    }
  }

  return (
    <DealForm
      dealExistant={dealExistant}
      onSubmit={gererSoumission}
      onAnnuler={() => navigate("/deals")}
    />
  );
}
