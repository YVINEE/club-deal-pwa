import { Echeance } from "../types";

const PREFERENCE_KEY = "club-deal-notifications-echeances";
const ENVOYEES_KEY = "club-deal-notifications-envoyees";

function cleDuJour(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function notificationsDisponibles(): boolean {
  return typeof Notification !== "undefined";
}

export function notificationsEcheancesActivees(): boolean {
  return localStorage.getItem(PREFERENCE_KEY) === "true";
}

export function enregistrerPreferenceNotifications(activees: boolean): void {
  localStorage.setItem(PREFERENCE_KEY, String(activees));
}

export async function demanderPermissionNotifications(): Promise<boolean> {
  if (!notificationsDisponibles()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

export function echeancesDuJour(echeances: Echeance[], maintenant = new Date()): Echeance[] {
  const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const fin = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 1);
  return echeances.filter((echeance) => !echeance.encaissee && echeance.date >= debut && echeance.date < fin);
}

function lireNotificationsEnvoyees(): Set<string> {
  try {
    const contenu = JSON.parse(localStorage.getItem(ENVOYEES_KEY) ?? "[]");
    return new Set(Array.isArray(contenu) ? contenu.filter((valeur): valeur is string => typeof valeur === "string") : []);
  } catch {
    return new Set();
  }
}

export function notifierEcheancesDuJour(
  echeances: Echeance[],
  nomsParDeal: Map<string, string> = new Map(),
  maintenant = new Date(),
): number {
  if (!notificationsDisponibles() || Notification.permission !== "granted") return 0;

  const envoyees = lireNotificationsEnvoyees();
  const jour = cleDuJour(maintenant);
  let nombreEnvoye = 0;

  for (const echeance of echeancesDuJour(echeances, maintenant)) {
    const cle = `${echeance.id}:${jour}`;
    if (envoyees.has(cle)) continue;

    const nomDeal = nomsParDeal.get(echeance.dealId) ?? "Votre deal";
    const notification = new Notification("Échéance aujourd’hui", {
      body: `${nomDeal} · ${echeance.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
      tag: cle,
    });
    notification.onclick = () => {
      window.focus();
      window.location.assign(`${import.meta.env.BASE_URL}echeances`);
      notification.close();
    };
    envoyees.add(cle);
    nombreEnvoye += 1;
  }

  localStorage.setItem(ENVOYEES_KEY, JSON.stringify([...envoyees]));
  return nombreEnvoye;
}
