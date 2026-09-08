import { Deal, Echeance } from "../types";
import { telechargerCsv } from "../exporters/csvExporter";
import { telechargerIcs } from "../exporters/icsExporter";
import { Button } from "@/components/ui/button";
import { CalendarDays, FileSpreadsheet } from "lucide-react";

interface ExportTabProps {
  deal: Deal;
  echeances: Echeance[];
}

export function ExportTab({ deal, echeances }: ExportTabProps) {
  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => telechargerCsv(deal, echeances)} variant="outline" className="h-12 justify-start">
        <FileSpreadsheet size={18} aria-hidden="true" />
        Exporter en CSV
      </Button>

      <Button onClick={() => telechargerIcs(deal, echeances)} variant="outline" className="h-12 justify-start">
        <CalendarDays size={18} aria-hidden="true" />
        Exporter en ICS (calendrier)
      </Button>

      {echeances.length === 0 && <div className="text-center text-gray-500 py-4">Aucune échéance à exporter</div>}
    </div>
  );
}
