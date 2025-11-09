import { Card } from "@/components/ui/card";
import { AgentMessage } from "./AgentMessage";
import { FinalReport } from "./FinalReport";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface AgentThought {
  type: "agent_thought";
  agent: string;
  message: string;
  timestamp?: number;
  proposed_smiles?: string;
  validation_data?: Record<string, any>;
}

export interface FinalReportData {
  type: "final_report";
  data: {
    status: "Success" | "Failure";
    final_smiles: string;
    validation: Record<string, any>;
    history: string[];
    attempts: number;
  };
}

export type StreamMessage = AgentThought | FinalReportData;

interface LabMonitorProps {
  messages: StreamMessage[];
  isRunning: boolean;
}

export const LabMonitor = ({ messages, isRunning }: LabMonitorProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const finalReport = messages.find((m) => m.type === "final_report") as FinalReportData | undefined;
  const thoughts = messages.filter((m) => m.type === "agent_thought") as AgentThought[];

  useEffect(() => {
    // We add a 'smooth' behavior to make it look nice.
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // This dependency is correct

  return (
    <Card className="h-full flex flex-col border-border shadow-medium">
      <div className="border-b border-border bg-gradient-subtle p-4">
        <div className="flex items-center justify-between">
          <div>
          <Tooltip>
          <TooltipTrigger>
            <h2 className="text-xl font-semibold text-foreground">Lab Monitor</h2>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm text-muted-foreground mt-1">This panel displays the real-time agent activity and research progress.</p>
          </TooltipContent>
            </Tooltip>
          </div>
          {isRunning && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
              <span className="font-medium">Agents Active</span>
            </div>
          )}
        </div>
      </div>

      {/* MODIFICATION: Added 'min-h-0'
        In a flexbox column ('flex-col' on the Card), a 'flex-1' child (this 'ScrollArea')
        is supposed to fill the remaining space. However, if its content is too large,
        it can sometimes "overflow" and push the parent's boundaries instead of
        scrolling internally.
        
        'min-h-0' tells the browser that this element's minimum height can be zero,
        which resolves this conflict and forces the content to scroll within the
        'flex-1' container as intended. This prevents the 'Card' from "growing down".
      */}
      <ScrollArea className="flex-1 p-6 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="space-y-2 max-w-md">
              <div className="text-4xl mb-4">🔬</div>
              <p className="text-muted-foreground">
                Configure your research parameters and click "Run Research Crew" to begin
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {thoughts.map((thought, index) => (
              <AgentMessage key={index} thought={thought} />
            ))}
            
            {finalReport && <FinalReport report={finalReport.data} />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};