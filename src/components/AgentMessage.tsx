import { Card } from "@/components/ui/card";
import { MoleculeVisualization } from "./MoleculeVisualization";
import { useState, useEffect } from "react";
import { Bot, Network } from "lucide-react"; // Imported GitNetwork for Router

interface AgentMessageProps {
  thought: {
    agent: string;
    message: string;
    timestamp?: number;
    proposed_smiles?: string;
    validation_data?: Record<string, any>;
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

// --- HELPER FUNCTION TO FORMAT KEY ---
const formatValidationKey = (key: string): string => {
  return key
    .replace(/_/g, ' ') // replace underscores
    .replace('mw', 'MW') // capitalize MW
    .replace('hbd', 'H-Bond Donors')
    .replace('hba', 'H-Bond Acceptors')
    .replace('tpsa', 'TPSA')
    .replace('logp', 'LogP')
    .split(' ')
    .map(s => s.charAt(0).toUpperCase() + s.substring(1)) // capitalize each word
    .join(' ');
};

export const AgentMessage = ({ thought }: AgentMessageProps) => {
  const agentColor = agentColors[thought.agent] || "bg-muted border-muted text-muted-foreground";
  const Icon = agentIcons[thought.agent] || Bot;

  const showVisualization = thought.agent === "Designer" &&
                            thought.proposed_smiles &&
                            thought.proposed_smiles.length > 0;
  
  // --- NEW: Check for validation data to render ---
  const validationDataEntries = thought.validation_data
    ? Object.entries(thought.validation_data)
        .filter(([key]) => key !== 'summary' && key !== 'is_valid' && key !== 'meets_constraints') // Filter out metadata
    : [];

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
          
          {/* Render the summary message */}
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {thought.message}
          </p>
          
          {/* --- NEW: Render formatted data if it exists --- */}
          {validationDataEntries.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {validationDataEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{formatValidationKey(key)}</span>
                    <span className="font-mono font-medium text-foreground">
                      {/* Format numbers nicely */}
                      {typeof value === 'number' ? 
                        (value % 1 === 0 ? value : value.toFixed(4)) 
                        : String(value)
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render the molecule visualization (only for Designer) */}
          {showVisualization && (
            <div className="space-y-3 mt-4 pt-4 border-t border-border">
              <MoleculeVisualization smiles={thought.proposed_smiles!} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};