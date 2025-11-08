import { Card } from "@/components/ui/card";
import { MoleculeVisualization } from "./MoleculeVisualization";
import { useState, useEffect } from "react";
import { Bot, Network } from "lucide-react"; // Imported GitNetwork for Router

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
  Router: "bg-purple-500/10 border-purple-500/20 text-purple-500", // Added Router
};

// Custom icons for each agent
const agentIcons: Record<string, React.ElementType> = {
  Designer: Bot,
  Validator: Bot,
  Synthesizer: Bot,
  Router: Network, // Added Router icon
};

const extractSmilesStrings = (text: string): string[] => {
  const smilesPatterns = [
    // This is the new pattern to match the Designer's output
    /Proposed[:\s]+([A-Za-z0-9@+\-\[\]\(\)=#$\/\\%]+)/gi,
    // Original patterns
    /`([A-Za-z0-9@+\-\[\]\(\)=#$\/\\%]+)`/g,
    /SMILES[:\s]+([A-Za-z0-9@+\-\[\]\(\)=#$\/\\%]+)/gi,
    /molecule[:\s]+([A-Za-z0-9@+\-\[\]\(\)=#$\/\\%]+)/gi,
  ];

  const found: string[] = [];
  
  for (const pattern of smilesPatterns) {
    // Use matchAll to find all occurrences
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const potential = match[1];
      // Basic validation: not just a number, has some letters, and is a reasonable length
      if (potential && potential.length > 3 && /[a-zA-Z]/.test(potential)) {
        found.push(potential);
      }
    }
  }

  // Return unique strings
  return [...new Set(found)];
};

export const AgentMessage = ({ thought }: AgentMessageProps) => {
  const [smilesStrings, setSmilesStrings] = useState<string[]>([]);
  const agentColor = agentColors[thought.agent] || "bg-muted border-muted text-muted-foreground";
  const Icon = agentIcons[thought.agent] || Bot;

  useEffect(() => {
    const smiles = extractSmilesStrings(thought.message);
    setSmilesStrings(smiles);
  }, [thought.message]);

  return (
    <Card className="p-4 border-border shadow-soft animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 border ${agentColor}`}>
          <Icon className="h-4 w-4" />
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
              <p className="text-xs font-medium text-muted-foreground">Detected Molecules:</p>
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