import { Card } from "@/components/ui/card";
import { MoleculeVisualization } from "./MoleculeVisualization";
import { useState, useEffect } from "react";
import { Bot } from "lucide-react";

interface AgentMessageProps {
  thought: {
    agent: string;
    message: string;
    timestamp?: number;
  };
}

const agentColors: Record<string, string> = {
  Designer: "bg-primary/10 border-primary/20 text-primary",
  Validator: "bg-secondary/10 border-secondary/20 text-secondary",
  Synthesizer: "bg-accent/10 border-accent/20 text-accent",
};

const extractSmilesStrings = (text: string): string[] => {
  const smilesPatterns = [
    /`([A-Za-z0-9@+\-\[\]\(\)=#$\/\\%]+)`/g,
    /SMILES[:\s]+([A-Za-z0-9@+\-\[\]\(\)=#$\/\\%]+)/gi,
    /molecule[:\s]+([A-Za-z0-9@+\-\[\]\(\)=#$\/\\%]+)/gi,
  ];

  const found: string[] = [];
  
  for (const pattern of smilesPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const potential = match[1];
      if (potential && potential.length > 5 && /[A-Z]/.test(potential)) {
        found.push(potential);
      }
    }
  }

  return [...new Set(found)];
};

export const AgentMessage = ({ thought }: AgentMessageProps) => {
  const [smilesStrings, setSmilesStrings] = useState<string[]>([]);
  const agentColor = agentColors[thought.agent] || "bg-muted border-muted text-muted-foreground";

  useEffect(() => {
    const smiles = extractSmilesStrings(thought.message);
    if (smiles.length > 0) {
      setSmilesStrings(smiles);
    }
  }, [thought.message]);

  return (
    <Card className="p-4 border-border shadow-soft animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 border ${agentColor}`}>
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="font-semibold text-sm text-foreground">{thought.agent}</p>
            {thought.timestamp && (
              <p className="text-xs text-muted-foreground">
                {new Date(thought.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {thought.message}
          </p>
          
          {smilesStrings.length > 0 && (
            <div className="space-y-3 mt-4 pt-4 border-t border-border">
              {smilesStrings.map((smiles, index) => (
                <MoleculeVisualization key={index} smiles={smiles} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
