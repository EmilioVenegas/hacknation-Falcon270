import { Card } from "@/components/ui/card";
import { MoleculeVisualization } from "./MoleculeVisualization";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

// This is the *actual* shape of the report from graph.py
interface FinalReportProps {
  report: {
    status: "Success" | "Failure";
    final_smiles: string;
    validation: Record<string, any>;
    history: string[];
    attempts: number;
  };
}

export const FinalReport = ({ report }: FinalReportProps) => {
  const [isOpen, setIsOpen] = useState(true); // Default open to show data
  const isSuccess = report.status === "Success";
  const statusColor = isSuccess ? "accent" : "destructive";
  const StatusIcon = isSuccess ? CheckCircle2 : AlertTriangle;

  return (
    <div className={`space-y-4 pt-6 border-t-2 border-${statusColor}/20 animate-in fade-in-50 slide-in-from-bottom-4 duration-700`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`bg-${statusColor}/10 border-2 border-${statusColor} rounded-lg p-2`}>
            <StatusIcon className={`h-6 w-6 text-${statusColor}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isSuccess ? "Research Complete!" : "Research Failed"}
            </h3>
            <p className="text-sm text-muted-foreground">Collective Insight Report</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {report.attempts} Attempts
        </Badge>
      </div>

      <Card className={`p-6 bg-${statusColor}/5 border-${statusColor}/20 shadow-medium`}>
        <h4 className="font-semibold text-foreground mb-3">Summary</h4>
        <div className="prose prose-sm max-w-none text-foreground/90">
          <p className="mb-2 leading-relaxed">
            {/* Use the summary from the validation results, as "executive_summary"
              doesn't exist in the Python output.
            */}
            {report.validation?.summary || "No summary available."}
          </p>
        </div>
      </Card>

      <div>
        <h4 className="font-semibold text-foreground mb-3">Final Molecule Proposal</h4>
        <MoleculeVisualization smiles={report.final_smiles} />
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between hover:bg-muted"
          >
            {/* Change "Verifiable Sources" to "Validation Data" to match
              the 'validation' key from the Python output.
            */}
            <span>Show Validation Data</span>
            <ChevronDown 
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <Card className="p-4 bg-muted/30 border-border">
            <pre className="text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(report.validation, null, 2)}
            </pre>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};