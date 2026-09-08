import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConfigurationPin,
  creerConfigurationPin,
  verifierPin,
} from "../utils/pinUtils";

const CLE_CONFIGURATION = "club-deal-security";
const DELAI_VERROUILLAGE = 5 * 60 * 1000;

function lireConfiguration(): ConfigurationPin | null {
  try {
    const valeur = localStorage.getItem(CLE_CONFIGURATION);
    if (!valeur) return null;

    const configuration = JSON.parse(valeur) as ConfigurationPin;
    if (
      typeof configuration.sel !== "string" ||
      typeof configuration.empreinte !== "string" ||
      typeof configuration.iterations !== "number"
    ) {
      return null;
    }
    return configuration;
  } catch {
    return null;
  }
}

function enregistrerConfiguration(configuration: ConfigurationPin): void {
  localStorage.setItem(CLE_CONFIGURATION, JSON.stringify(configuration));
}

export function useAppLock() {
  const [configuration, setConfiguration] = useState<ConfigurationPin | null>(lireConfiguration);
  const [verrouille, setVerrouille] = useState(() => configuration !== null);
  const timerRef = useRef<number | null>(null);

  const programmerVerrouillage = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVerrouille(true), DELAI_VERROUILLAGE);
  }, []);

  useEffect(() => {
    if (!configuration || verrouille) return;

    const actualiserActivite = () => programmerVerrouillage();
    const verrouillerArrierePlan = () => {
      if (document.hidden) setVerrouille(true);
    };

    window.addEventListener("pointerdown", actualiserActivite);
    window.addEventListener("keydown", actualiserActivite);
    window.addEventListener("touchstart", actualiserActivite);
    document.addEventListener("visibilitychange", verrouillerArrierePlan);
    programmerVerrouillage();

    return () => {
      window.removeEventListener("pointerdown", actualiserActivite);
      window.removeEventListener("keydown", actualiserActivite);
      window.removeEventListener("touchstart", actualiserActivite);
      document.removeEventListener("visibilitychange", verrouillerArrierePlan);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [configuration, verrouille, programmerVerrouillage]);

  const deverrouiller = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!configuration || !(await verifierPin(pin, configuration))) return false;
      setVerrouille(false);
      return true;
    },
    [configuration]
  );

  const activerProtection = useCallback(async (pin: string): Promise<void> => {
    const nouvelleConfiguration = await creerConfigurationPin(pin);
    enregistrerConfiguration(nouvelleConfiguration);
    setConfiguration(nouvelleConfiguration);
    setVerrouille(false);
  }, []);

  const modifierPin = useCallback(
    async (ancienPin: string, nouveauPin: string): Promise<boolean> => {
      if (!configuration || !(await verifierPin(ancienPin, configuration))) return false;
      const nouvelleConfiguration = await creerConfigurationPin(nouveauPin);
      enregistrerConfiguration(nouvelleConfiguration);
      setConfiguration(nouvelleConfiguration);
      return true;
    },
    [configuration]
  );

  const desactiverProtection = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!configuration || !(await verifierPin(pin, configuration))) return false;
      localStorage.removeItem(CLE_CONFIGURATION);
      setConfiguration(null);
      setVerrouille(false);
      return true;
    },
    [configuration]
  );

  return {
    protectionActive: configuration !== null,
    verrouille,
    deverrouiller,
    activerProtection,
    modifierPin,
    desactiverProtection,
  };
}
