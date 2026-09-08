import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useDeals } from "./hooks/useDeals";
import { DealList } from "./components/DealList";
import { DealDetail } from "./components/DealDetail";
import { DealForm } from "./components/DealForm";
import { PinLockScreen } from "./components/PinLockScreen";
import { useAppLock } from "./hooks/useAppLock";
import { Deal } from "./types";

type Theme = "light" | "dark";

export default function App() {
  const {
    protectionActive,
    verrouille,
    deverrouiller,
    activerProtection,
    modifierPin,
    desactiverProtection,
  } = useAppLock();
  const [theme, setTheme] = useState<Theme>(() => {
    const themeEnregistre = localStorage.getItem("club-deal-theme");
    if (themeEnregistre === "light" || themeEnregistre === "dark") return themeEnregistre;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("club-deal-theme", theme);
  }, [theme]);

  function basculerTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <>
      {verrouille && <PinLockScreen onUnlock={deverrouiller} />}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route
            path="/"
            element={
              <EcranListe
                theme={theme}
                onToggleTheme={basculerTheme}
                protectionActive={protectionActive}
                onActiverProtection={activerProtection}
                onModifierPin={modifierPin}
                onDesactiverProtection={desactiverProtection}
              />
            }
          />
          <Route path="/deal/:dealId" element={<EcranDetail theme={theme} onToggleTheme={basculerTheme} />} />
          <Route path="/nouveau" element={<EcranFormulaire theme={theme} onToggleTheme={basculerTheme} />} />
          <Route
            path="/deal/:dealId/modifier"
            element={<EcranFormulaire theme={theme} onToggleTheme={basculerTheme} />}
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

function EcranListe({
  theme,
  onToggleTheme,
  protectionActive,
  onActiverProtection,
  onModifierPin,
  onDesactiverProtection,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  protectionActive: boolean;
  onActiverProtection: (pin: string) => Promise<void>;
  onModifierPin: (ancienPin: string, nouveauPin: string) => Promise<boolean>;
  onDesactiverProtection: (pin: string) => Promise<boolean>;
}) {
  const navigate = useNavigate();
  return (
    <DealList
      theme={theme}
      onToggleTheme={onToggleTheme}
      protectionActive={protectionActive}
      onActiverProtection={onActiverProtection}
      onModifierPin={onModifierPin}
      onDesactiverProtection={onDesactiverProtection}
      onSelectDeal={(dealId) => navigate(`/deal/${dealId}`)}
      onAjouterDeal={() => navigate("/nouveau")}
    />
  );
}

function EcranDetail({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  if (!dealId) return null;

  return (
    <DealDetail
      dealId={dealId}
      theme={theme}
      onToggleTheme={onToggleTheme}
      onRetour={() => navigate("/")}
      onModifier={() => navigate(`/deal/${dealId}/modifier`)}
    />
  );
}

function EcranFormulaire({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
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
      theme={theme}
      onToggleTheme={onToggleTheme}
      onSubmit={gererSoumission}
      onAnnuler={() => navigate(dealExistant ? `/deal/${dealExistant.id}` : "/")}
    />
  );
}
