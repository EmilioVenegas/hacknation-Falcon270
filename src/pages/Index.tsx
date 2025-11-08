import { useState } from "react";
import { ControlPanel, ResearchParams } from "@/components/ControlPanel";
import { LabMonitor, StreamMessage } from "@/components/LabMonitor";
import { toast } from "sonner";
import { Beaker } from "lucide-react";

/**
 * Parses a raw log message (e.g., "AgentName (Attempt 1): Message")
 * into a structured agent name and message.
 */
const parseAgentMessage = (
  rawMessage: string,
): { agent: string; message: string } => {
  const parts = rawMessage.split(": ");
  if (parts.length > 1) {
    // "Designer (Attempt 1)" -> "Designer"
    const agent = parts[0].split(" (")[0].trim();
    const message = parts.slice(1).join(": ");
    return { agent, message };
  }
  // Fallback for messages without a prefix
  return { agent: "System", message: rawMessage };
};

const Index = () => {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunCrew = async (params: ResearchParams) => {
    setIsRunning(true);
    setMessages([]);
    toast.success("Research crew started!");

    try {
      // 1. Format the request payload to match main.py's CrewRequest model
      const payload = {
        smiles: params.smiles,
        goal: params.goal,
        constraints: {
          similarity: params.similarity,
          mwMin: params.mwMin,
          mwMax: params.mwMax,
        },
      };

      // 2. Use fetch for POST request with streaming response
      const response = await fetch("/api/run-crew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(
          response.statusText || "Failed to connect to the server.",
        );
      }

      // 3. Manually read and decode the SSE stream
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          // Stream finished normally
          break;
        }

        buffer += value;
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep the last, potentially incomplete, message

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          try {
            const jsonData = line.substring(6); // Remove "data: "
            const parsedData = JSON.parse(jsonData);

            // 4. Handle different event types from the backend
            if (parsedData.type === "agent_thought") {
              const { agent, message } = parseAgentMessage(parsedData.message);
              setMessages((prev) => [
                ...prev,
                {
                  type: "agent_thought",
                  agent: agent,
                  message: message,
                  timestamp: Date.now(),
                } as StreamMessage,
              ]);
            } else if (parsedData.type === "final_report") {
              setMessages((prev) => [
                ...prev,
                {
                  type: "final_report",
                  data: parsedData.data,
                } as StreamMessage,
              ]);
            } else if (parsedData.type === "error") {
              toast.error(`Stream error: ${parsedData.message}`);
              reader.cancel(); // Stop the stream
            } else if (parsedData.type === "stream_end") {
              // Backend signals a clean finish
              reader.cancel();
              setIsRunning(false);
              toast.success("Research complete!");
            }
          } catch (e) {
            console.error("Failed to parse SSE message:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error running crew:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to run research crew.",
      );
    } finally {
      // Ensure running state is reset even if loop breaks unexpectedly
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo del Agente" className="h-20 w-auto" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Arq Molecular Engineering
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-Powered Molecular Design & Optimization
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
          <ControlPanel onRunCrew={handleRunCrew} isRunning={isRunning} />
          <LabMonitor messages={messages} isRunning={isRunning} />
        </div>
      </main>
    </div>
  );
};

export default Index;