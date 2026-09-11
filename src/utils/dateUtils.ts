import { addMonths as fnsAddMonths, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Frequence } from "../types";

export function addMonths(date: Date, months: number): Date {
  return fnsAddMonths(date, months);
}

export function formatDateFr(date: Date): string {
  return format(date, "dd MMMM yyyy", { locale: fr });
}

export function formatDateCourteFr(date: Date): string {
  return format(date, "dd MMM yyyy", { locale: fr });
}

export function formatDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDateInput(value: string): Date {
  const [annee, mois, jour] = value.split("-").map(Number);
  return new Date(annee, mois - 1, jour, 12);
}

export function frequenceEnMois(frequence: Frequence): number {
  return frequence === "trimestriel" ? 3 : 6;
}
