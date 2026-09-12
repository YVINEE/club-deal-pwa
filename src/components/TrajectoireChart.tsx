import { formatDateFr } from "../utils/dateUtils";
import { PointCourbe } from "../utils/dashboard";

const formatMontant = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function montant(value: number): string {
  return formatMontant.format(value);
}

interface TrajectoireChartProps {
  points: PointCourbe[];
  compact?: boolean;
}

export function TrajectoireChart({ points, compact = false }: TrajectoireChartProps) {
  if (points.length < 2) return null;

  const maintenant = new Date();
  const largeur = 640;
  const hauteur = compact ? 150 : 190;
  const marge = 14;
  const valeurs = points.map((point) => point.valeur);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const amplitude = max - min || 1;
  const position = (point: PointCourbe, index: number) => {
    const x = marge + (index / (points.length - 1)) * (largeur - marge * 2);
    const y = hauteur - marge - ((point.valeur - min) / amplitude) * (hauteur - marge * 2);
    return { x, y };
  };
  const coordonnees = points.map(position);
  const ligne = coordonnees.map(({ x, y }) => x + "," + y).join(" ");
  const ligneHistorique = coordonnees
    .map((coord, index) => (points[index].projection ? null : coord.x + "," + coord.y))
    .filter((coord): coord is string => coord !== null)
    .join(" ");
  const premierFutur = points.findIndex((point) => point.projection);
  const ligneProjection =
    premierFutur === -1
      ? ""
      : [coordonnees[Math.max(0, premierFutur - 1)], ...coordonnees.slice(premierFutur)]
          .map(({ x, y }) => x + "," + y)
          .join(" ");
  const base = hauteur - marge;
  const aire = ligne + " " + (largeur - marge) + "," + base + " " + marge + "," + base;
  const debut = points[0].date.getTime();
  const fin = points[points.length - 1].date.getTime();
  const maintenantDansPeriode = maintenant.getTime() >= debut && maintenant.getTime() <= fin;
  const afficherRepere = !compact || maintenantDansPeriode;
  const ratioAujourdHui = fin === debut ? 1 : Math.min(1, Math.max(0, (maintenant.getTime() - debut) / (fin - debut)));
  const xAujourdHui = marge + ratioAujourdHui * (largeur - marge * 2);
  const indexAujourdHui = Math.min(points.length - 1, Math.max(0, Math.round(ratioAujourdHui * (points.length - 1))));
  const pointAujourdHui = coordonnees[indexAujourdHui];

  return (
    <div className={compact ? "mt-2" : "mt-5"}>
      <div className="mb-1 flex items-center justify-end gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          <i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
          Réel
        </span>
        <span>
          <i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-purple-400" />
          Projeté
        </span>
      </div>
      {afficherRepere && (
        <div className="mb-2 flex justify-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200"
            aria-label={"Repère : Aujourd’hui, " + formatDateFr(maintenant)}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Aujourd’hui · {formatDateFr(maintenant)}
          </span>
        </div>
      )}
      <svg
        viewBox={"0 0 " + largeur + " " + hauteur}
        className={compact ? "h-32 w-full" : "h-44 w-full"}
        role="img"
        aria-label="Évolution réelle et projetée de la valeur du portefeuille"
      >
        <defs>
          <linearGradient id="dashboard-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={aire} fill="url(#dashboard-area)" />
        {maintenantDansPeriode && (
          <>
            <line x1={xAujourdHui} x2={xAujourdHui} y1={marge} y2={base} stroke="#10b981" strokeDasharray="5 3" strokeOpacity="0.9" strokeWidth="2" />
            <circle cx={xAujourdHui} cy={pointAujourdHui.y} r="6" fill="#0e1422" stroke="#34d399" strokeWidth="2.5" />
          </>
        )}
        <polyline points={ligne} fill="none" stroke="#3b82f6" strokeOpacity="0.2" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={ligneHistorique} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {ligneProjection && (
          <polyline points={ligneProjection} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="7 5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      {!compact && (
        <div className="mt-2 grid grid-cols-2 items-end text-[11px] text-slate-500">
          <div>
            <div className="uppercase tracking-wide">Départ</div>
            <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{montant(points[0].valeur)}</div>
            <div>{formatDateFr(points[0].date)}</div>
          </div>
          <div className="text-right">
            <div className="uppercase tracking-wide">Fin de période</div>
            <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{montant(points[points.length - 1].valeur)}</div>
            <div>{formatDateFr(points[points.length - 1].date)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
