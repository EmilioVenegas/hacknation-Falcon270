import { Card } from "@/components/ui/card";
import { MoleculeVisualization } from "./MoleculeVisualization";
import { CheckCircle2, AlertTriangle, BarChart as BarChartIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
// --- NEW IMPORTS for Chart ---
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";

// This is the *actual* shape of the report from graph.py
interface FinalReportProps {
  report: {
    status: "Success" | "Failure";
    final_smiles: string;
    // Updated validation type to reflect changes in graph.py
    validation: Record<string, any> & {
      original_props?: Record<string, any>;
    };
    history: string[];
    attempts: number;
  };
}

// --- NEW CHART COMPONENT ---
interface ComparisonChartProps {
    original: Record<string, any>;
    proposed: Record<string, any>;
}

const ComparisonChart = ({ original, proposed }: ComparisonChartProps) => {
    // 1. Define the chart data structure
    const data = useMemo(() => {
        // Properties to compare (key, label, unit)
        const propsToCompare = [
            { key: "logp", label: "LogP", unit: "" },
            { key: "mw", label: "MW", unit: " Da" },
            { key: "tpsa", label: "TPSA", unit: " Å²" },
            { key: "qed", label: "QED", unit: "" },
        ];

        return propsToCompare.map((prop) => ({
            name: prop.label,
            original: original[prop.key],
            proposed: proposed[prop.key],
            unit: prop.unit,
        }));
    }, [original, proposed]);
    
    // 2. Define the chart configuration
    const chartConfig = {
      original: {
        label: "Original",
        color: "hsl(var(--primary))",
      },
      proposed: {
        label: "Proposed",
        color: "hsl(var(--accent))",
      },
    } satisfies ChartConfig;

    return (
        <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    className="text-xs"
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => value.toFixed(value < 1 ? 2 : 0)}
                    className="text-xs"
                />
                <ChartTooltip content={
                    <ChartTooltipContent 
                        className="text-xs" 
                        formatter={(value, name, item) => [
                            `${typeof value === 'number' ? value.toFixed(name === 'QED' ? 4 : 2) : value}${item.payload.unit}`,
                            name,
                        ]}
                    />} 
                />
                <Bar dataKey="original" fill="var(--color-original)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="proposed" fill="var(--color-proposed)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ChartContainer>
    );
};
// --- END NEW CHART COMPONENT ---


export const FinalReport = ({ report }: FinalReportProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSuccess = report.status === "Success";
  const statusColor = isSuccess ? "accent" : "destructive";
  const StatusIcon = isSuccess ? CheckCircle2 : AlertTriangle;

  // Extract comparison data
  const originalProps = report.validation.original_props || {};
  
  // Filter out meta-keys from the proposed molecule's data
  const { is_valid, summary, original_props: _, ...proposedProps } = report.validation; 

  const showChart = originalProps.is_valid && proposedProps.is_valid;
  
  // Helper function to format keys for the data table
  const formatValidationKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace('mw', 'MW')
      .replace('hbd', 'H-Bond Donors')
      .replace('hba', 'H-Bond Acceptors')
      .replace('tpsa', 'TPSA')
      .replace('logp', 'LogP')
      .replace('qed', 'QED') 
      .split(' ')
      .map(s => s.charAt(0).toUpperCase() + s.substring(1))
      .join(' ');
  };
  
  // Combine all properties into a single, sortable list for the detailed table view
  const allProperties = useMemo(() => {
    const combinedKeys = new Set([
      ...Object.keys(originalProps).filter(k => k !== 'is_valid'),
      ...Object.keys(proposedProps).filter(k => k !== 'is_valid')
    ]);
    
    return Array.from(combinedKeys).sort().map(key => ({
      key: key,
      label: formatValidationKey(key),
      originalValue: originalProps[key],
      proposedValue: proposedProps[key],
    }));
  }, [originalProps, proposedProps]);


  return (
    <div className={`space-y-4 pt-6 border-t-2 border-${statusColor}/20 animate-in fade-in-50 slide-in-from-bottom-4 duration-700`}>
      <Card className={`p-6 bg-${statusColor}/5 border-${statusColor}/20 shadow-medium`}>
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
            {report.validation?.summary || "No summary available."}
          </p>
        </div>
      </Card>
      
      {/* --- NEW: Comparison Chart --- */}
      {showChart && (
        <Card className="p-2 border-border shadow-soft space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
                <BarChartIcon className="h-4 w-4" /> Property Comparison
            </h4>
            <ComparisonChart 
                original={originalProps} 
                proposed={proposedProps}
            />
        </Card>
      )}

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
            <span>Show Detailed Validation Data</span>
            <ChevronDown 
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          {/* --- MODIFIED: Detailed data view as a table-like list --- */}
          <Card className="p-4 bg-muted/30 border-border space-y-2">
             <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground border-b pb-2">
                <span>Property</span>
                <span className="text-right">Original</span>
                <span className="text-right">Proposed</span>
             </div>
             {allProperties.map(({ key, label, originalValue, proposedValue }) => (
                <div key={key} className="grid grid-cols-3 text-sm">
                    <span className="text-foreground">{label}</span>
                    <span className="font-mono text-right text-foreground">
                      {typeof originalValue === 'number' ? (originalValue % 1 !== 0 ? originalValue.toFixed(4) : originalValue) : String(originalValue)}
                    </span>
                    <span className="font-mono text-right text-accent font-medium">
                       {typeof proposedValue === 'number' ? (proposedValue % 1 !== 0 ? proposedValue.toFixed(4) : proposedValue) : String(proposedValue)}
                    </span>
                </div>
             ))}
             {/* Fallback to raw JSON */}
             
          </Card>
          <p className="pt-4 text-xs text-muted-foreground">Raw Validation Report:</p>
             <pre className="text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(report.validation, null, 2)}
            </pre>
        </CollapsibleContent>
      </Collapsible>
      </Card>
    </div>
  );
};