import { Card } from "@/components/ui/card";
import { MoleculeVisualization } from "./MoleculeVisualization";
import { CheckCircle2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";


interface FinalReportProps {
  report: {
    executive_summary: string;
    final_smiles: string;
    verifiable_data: Record<string, any>;
  };
}

export const FinalReport = ({ report }: FinalReportProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4 pt-6 border-t-2 border-accent/20 animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-accent/10 border-2 border-accent rounded-lg p-2">
          <CheckCircle2 className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Research Complete!</h3>
          <p className="text-sm text-muted-foreground">Collective Insight Report</p>
        </div>
      </div>

      <Card className="p-6 bg-accent/5 border-accent/20 shadow-medium">
        <h4 className="font-semibold text-foreground mb-3">Executive Summary</h4>
        <div className="prose prose-sm max-w-none text-foreground/90">
          {report.executive_summary.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-2 leading-relaxed">{paragraph}</p>
          ))}
        </div>
      </Card>

      <div>
        <h4 className="font-semibold text-foreground mb-3">Final Optimized Molecule</h4>
        <MoleculeVisualization smiles={report.final_smiles} />
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between hover:bg-muted"
          >
            <span>Show Verifiable Sources</span>
            <ChevronDown 
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <Card className="p-4 bg-muted/30 border-border">
            <pre className="text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(report.verifiable_data, null, 2)}
            </pre>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
