import { useState } from "react";
import { ControlPanel, ResearchParams } from "@/components/ControlPanel";
import { LabMonitor, StreamMessage } from "@/components/LabMonitor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { Beaker } from "lucide-react";

const Index = () => {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunCrew = async (params: ResearchParams) => {
    setIsRunning(true);
    setMessages([]);

    try {
      // TODO: Replace with actual SSE endpoint when backend is ready
      // const eventSource = new EventSource(`/api/run-crew?${new URLSearchParams({
      //   smiles: params.smiles,
      //   goal: params.goal,
      //   similarity: params.similarity.toString(),
      //   mwMin: params.mwMin.toString(),
      //   mwMax: params.mwMax.toString(),
      // })}`);

      // eventSource.onmessage = (event) => {
      //   const data = JSON.parse(event.data);
      //   setMessages(prev => [...prev, data]);
      //   if (data.type === 'final_report') {
      //     eventSource.close();
      //     setIsRunning(false);
      //   }
      // };

      // eventSource.onerror = () => {
      //   eventSource.close();
      //   setIsRunning(false);
      //   toast.error("Connection error. Please try again.");
      // };

      // Mock streaming for demo purposes
      toast.success("Research crew started!");
      
      const mockMessages: StreamMessage[] = [
        {
          type: "agent_thought",
          agent: "Designer",
          message: "Analyzing the starting molecule. I will propose modifications to decrease LogP by introducing polar groups. Let me suggest adding a hydroxyl group at position C3. Proposed SMILES: `CC(O)(C(=O)O)c1ccc(cc1)C(O)CCCN2CCC(CC2)C(O)(c3ccccc3)c4ccccc4`",
          timestamp: Date.now(),
        },
        {
          type: "agent_thought",
          agent: "Validator",
          message: "Validating the proposed structure... The SMILES string is chemically valid. Calculating properties: LogP decreased from 4.8 to 4.2, molecular weight increased slightly to 524.7. Tanimoto similarity is 0.85, within acceptable range. Structure approved for synthesis review.",
          timestamp: Date.now() + 2000,
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
                  proposed_smiles: parsedData.proposed_smiles,
                  validation_data: parsedData.validation_data,
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
      toast.error("Failed to run research crew. Please try again.");
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
            <ThemeToggle />
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
