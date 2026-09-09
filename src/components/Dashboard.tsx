import { useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { CalendarClock, Check, Database, TrendingUp } from "lucide-react";
import { formatDateFr } from "../utils/dateUtils";
import { calculerSyntheseDashboard, DashboardDeal, PointCourbe } from "../utils/dashboard";
import { StorageMode } from "../db/secureStorage";

interface DashboardProps {
  deals: DashboardDeal[];
  suiviEncaissementsActif: boolean;
  onPointer: (echeanceId: string) => Promise<void>;
  storageMode: StorageMode;
}

const formatMontant = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const formatPourcentage = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function montant(value: number): string {
  return formatMontant.format(value);
}

function pourcentage(value: number): string {
  return formatPourcentage.format(value) + " %";
}

export function Dashboard({ deals, suiviEncaissementsActif, onPointer, storageMode }: DashboardProps) {
  const synthese = useMemo(
    () => calculerSyntheseDashboard(deals, new Date(), { suiviEncaissements: suiviEncaissementsActif }),
    [deals, suiviEncaissementsActif],
  );
  const dealsActifs = deals.filter(({ statut }) => statut !== "termine").length;
  const gainAbsolu = synthese.totalActuel - synthese.totalInvesti;

  return (
    <section aria-labelledby="dashboard-title" className="mx-4 mt-4 overflow-hidden rounded-2xl border border-blue-500/10 bg-gradient-to-b from-[#141d2e] to-[#0e1422] p-4 text-white shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Portefeuille</p>
          <h2 id="dashboard-title" className="mt-1 text-lg font-semibold">
            Vue d’ensemble
          </h2>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <Database size={13} aria-hidden="true" />
            {storageMode === "encrypted" ? "Base locale chiffrée" : "Base locale non chiffrée"}
          </div>
        </div>
        <div className="rounded-full bg-blue-500/15 p-2 text-blue-300">
          <TrendingUp size={18} aria-hidden="true" />
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-white/5 bg-black/10 p-3">
        <div className="text-xs uppercase tracking-[0.08em] text-slate-400">Valeur actuelle</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <strong className="text-2xl font-bold tabular-nums">{montant(synthese.totalActuel)}</strong>
          <span className="text-sm font-semibold text-emerald-300">
            +{pourcentage(synthese.performanceBrute)} · +{montant(gainAbsolu)}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Rendement moyen pondéré : {pourcentage(synthese.rendementMoyenPondere)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Indicateur label="Capital investi" valeur={montant(synthese.totalInvesti)} />
        <Indicateur label="Gains acquis" valeur={montant(synthese.interetsAcquis)} couleur="text-emerald-300" />
        <Indicateur label="Gains futurs" valeur={montant(synthese.interetsFuturs)} couleur="text-emerald-300" />
        <Indicateur label="Total final prévu" valeur={montant(synthese.totalFinal)} couleur="text-purple-300" />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>
          {dealsActifs} deal{dealsActifs > 1 ? "s" : ""} actif{dealsActifs > 1 ? "s" : ""}
        </span>
      </div>

      {synthese.prochaineEcheance && (
        <EcheanceBanner
          date={synthese.prochaineEcheance.date}
          montantEcheance={synthese.prochaineEcheance.montant}
          nomDeal={synthese.prochaineEcheanceDealNom}
          echeanceId={synthese.prochaineEcheance.id}
          suiviEncaissementsActif={suiviEncaissementsActif}
          onPointer={onPointer}
        />
      )}

      <Courbe points={synthese.pointsCourbe} />
    </section>
  );
}

function Indicateur({
  label,
  valeur,
  couleur = "text-white",
}: {
  label: string;
  valeur: string;
  couleur?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#1a2234] p-3">
      <div className="text-[11px] uppercase tracking-[0.04em] text-slate-400">{label}</div>
      <div className={"mt-1 text-base font-semibold tabular-nums " + couleur}>{valeur}</div>
    </div>
  );
}

function EcheanceBanner({
  date,
  montantEcheance,
  nomDeal,
  echeanceId,
  suiviEncaissementsActif,
  onPointer,
}: {
  date: Date;
  montantEcheance: number;
  nomDeal?: string;
  echeanceId: string;
  suiviEncaissementsActif: boolean;
  onPointer: (echeanceId: string) => Promise<void>;
}) {
  const jours = differenceInCalendarDays(date, new Date());
  const delai =
    jours < 0
      ? "En retard de " + Math.abs(jours) + " jour" + (Math.abs(jours) > 1 ? "s" : "")
      : jours === 0
        ? "Aujourd’hui"
        : jours === 1
          ? "Demain"
          : "Dans " + jours + " jours";

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-500/10 p-3">
      <div className="rounded-full bg-blue-400/15 p-2 text-blue-300">
        <CalendarClock size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-[0.04em] text-blue-200">{delai}</div>
        <div className="truncate text-sm font-semibold text-white">
          {formatDateFr(date)} — {montant(montantEcheance)}
        </div>
        {nomDeal && <div className="truncate text-xs text-slate-400">{nomDeal}</div>}
      </div>
      {suiviEncaissementsActif && date <= new Date() && (
        <button
          type="button"
          onClick={() => onPointer(echeanceId)}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm"
        >
          <Check size={14} aria-hidden="true" />
          Pointer
        </button>
      )}
    </div>
  );
}

function Courbe({ points }: { points: PointCourbe[] }) {
  const [periode, setPeriode] = useState<"tout" | "2030">("tout");
  const pointsAffiches = useMemo(
    () => (periode === "2030" ? points.filter((point) => point.date.getFullYear() <= 2030) : points),
    [periode, points],
  );
  const pointsCourbe = pointsAffiches.length >= 2 ? pointsAffiches : points;

  if (points.length < 2) return null;

  const largeur = 640;
  const hauteur = 190;
  const marge = 14;
  const valeurs = pointsCourbe.map((point) => point.valeur);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const amplitude = max - min || 1;
  const position = (point: PointCourbe, index: number) => {
    const x = marge + (index / (points.length - 1)) * (largeur - marge * 2);
    const y = hauteur - marge - ((point.valeur - min) / amplitude) * (hauteur - marge * 2);
    return { x, y };
  };
  const coordonnees = pointsCourbe.map(position);
  const ligne = coordonnees.map(({ x, y }) => x + "," + y).join(" ");
  const ligneHistorique = coordonnees
    .map((coord, index) => (pointsCourbe[index].projection ? null : coord.x + "," + coord.y))
    .filter((coord): coord is string => coord !== null)
    .join(" ");
  const premierFutur = pointsCourbe.findIndex((point) => point.projection);
  const ligneProjection =
    premierFutur === -1
      ? ""
      : [coordonnees[Math.max(0, premierFutur - 1)], ...coordonnees.slice(premierFutur)]
          .map(({ x, y }) => x + "," + y)
          .join(" ");
  const base = hauteur - marge;
  const aire = ligne + " " + (largeur - marge) + "," + base + " " + marge + "," + base;
  const debut = pointsCourbe[0].date.getTime();
  const fin = pointsCourbe[pointsCourbe.length - 1].date.getTime();
  const ratioAujourdHui = fin === debut ? 1 : Math.min(1, Math.max(0, (Date.now() - debut) / (fin - debut)));
  const xAujourdHui = marge + ratioAujourdHui * (largeur - marge * 2);
  const indexAujourdHui = Math.min(pointsCourbe.length - 1, Math.max(0, Math.round(ratioAujourdHui * (pointsCourbe.length - 1))));
  const pointAujourdHui = coordonnees[indexAujourdHui];

  return (
    <div className="mt-5">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-medium">Trajectoire du portefeuille</div>
        <div className="flex gap-1 rounded-full bg-black/10 p-0.5 text-[11px]">
          {(["tout", "2030"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriode(option)}
              className={"rounded-full px-2 py-1 transition-colors " + (periode === option ? "bg-blue-500/20 text-blue-200" : "text-slate-500")}
            >
              {option === "tout" ? "Tout" : "2030"}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-1 flex items-center justify-end gap-3 text-[11px] text-slate-400">
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />Réel</span>
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-purple-400" />Projeté</span>
      </div>
      <svg
        viewBox={"0 0 " + largeur + " " + hauteur}
        className="h-44 w-full"
        role="img"
        aria-label="Évolution réelle et projetée du montant total"
      >
        <defs>
          <linearGradient id="dashboard-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={aire} fill="url(#dashboard-area)" />
        <line x1={xAujourdHui} x2={xAujourdHui} y1={marge} y2={base} stroke="#94a3b8" strokeDasharray="3 5" strokeOpacity="0.55" />
        <circle cx={xAujourdHui} cy={pointAujourdHui.y} r="5" fill="#0e1422" stroke="#60a5fa" strokeWidth="2" />
        <polyline points={ligne} fill="none" stroke="#3b82f6" strokeOpacity="0.2" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={ligneHistorique} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {ligneProjection && (
          <polyline points={ligneProjection} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="7 5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>{formatDateFr(points[0].date)}</span>
        <span className="text-slate-400">Aujourd’hui</span>
        <span>{formatDateFr(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}
