import { useMemo } from "react";
import { formatDateFr } from "../utils/dateUtils";
import { calculerSyntheseDashboard, DashboardDeal, PointCourbe } from "../utils/dashboard";

interface DashboardProps {
  deals: DashboardDeal[];
}

const formatMontant = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function montant(value: number): string {
  return formatMontant.format(value);
}

export function Dashboard({ deals }: DashboardProps) {
  const synthese = useMemo(() => calculerSyntheseDashboard(deals), [deals]);
  const dealsActifs = deals.filter(({ statut }) => statut !== "termine").length;

  return (
    <section aria-labelledby="dashboard-title" className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <h2 id="dashboard-title" className="mb-3 text-lg font-semibold">
        Vue d’ensemble
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicateur label="Capital investi" valeur={montant(synthese.totalInvesti)} />
        <Indicateur label="Gains acquis" valeur={montant(synthese.interetsAcquis)} couleur="text-green-600" />
        <Indicateur label="Valeur actuelle" valeur={montant(synthese.totalActuel)} couleur="text-blue-600" />
        <Indicateur label="Total final prévu" valeur={montant(synthese.totalFinal)} couleur="text-purple-600" />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
        <span>{dealsActifs} deal{dealsActifs > 1 ? "s" : ""} actif{dealsActifs > 1 ? "s" : ""}</span>
        <span>Gains futurs : {montant(synthese.interetsFuturs)}</span>
        {synthese.prochaineEcheance && (
          <span>
            Prochaine échéance : {formatDateFr(synthese.prochaineEcheance.date)} — {montant(synthese.prochaineEcheance.montant)}
          </span>
        )}
      </div>
      <Courbe points={synthese.pointsCourbe} />
    </section>
  );
}

function Indicateur({ label, valeur, couleur = "text-foreground" }: { label: string; valeur: string; couleur?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={"mt-1 text-base font-semibold " + couleur}>{valeur}</div>
    </div>
  );
}

function Courbe({ points }: { points: PointCourbe[] }) {
  if (points.length < 2) return null;

  const largeur = 640;
  const hauteur = 180;
  const marge = 12;
  const valeurs = points.map((point) => point.valeur);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const amplitude = max - min || 1;
  const position = (point: PointCourbe, index: number) => {
    const x = marge + (index / (points.length - 1)) * (largeur - marge * 2);
    const y = hauteur - marge - ((point.valeur - min) / amplitude) * (hauteur - marge * 2);
    return x + "," + y;
  };
  const historiques = points
    .map((point, index) => (!point.projection ? position(point, index) : null))
    .filter((point): point is string => point !== null);
  const premierFutur = points.findIndex((point) => point.projection);
  const projections =
    premierFutur === -1
      ? []
      : [
          position(points[Math.max(0, premierFutur - 1)], Math.max(0, premierFutur - 1)),
          ...points.slice(premierFutur).map((point, index) => position(point, premierFutur + index)),
        ];

  return (
    <div className="mt-4">
      <div className="mb-1 text-sm font-medium">Évolution du total</div>
      <svg
        viewBox={"0 0 " + largeur + " " + hauteur}
        className="h-44 w-full"
        role="img"
        aria-label="Évolution du montant total investi et des intérêts"
      >
        <polyline points={historiques.join(" ")} fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-600" />
        {projections.length > 1 && (
          <polyline
            points={projections.join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="8 6"
            className="text-purple-500"
          />
        )}
      </svg>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatDateFr(points[0].date)}</span>
        <span>{formatDateFr(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}
