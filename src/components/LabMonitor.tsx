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
}

export interface FinalReportData {
  type: "final_report";
  data: {
    executive_summary: string;
    final_smiles: string;
    verifiable_data: Record<string, any>;
  };
}

export type StreamMessage = AgentThought | FinalReportData;

interface LabMonitorProps {
  messages: StreamMessage[];
  isRunning: boolean;
}

export const LabMonitor = ({ messages, isRunning }: LabMonitorProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const finalReport = messages.find((m) => m.type === "final_report") as FinalReportData | undefined;
  const thoughts = messages.filter((m) => m.type === "agent_thought") as AgentThought[];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
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
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
