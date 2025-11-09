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
        {
          type: "agent_thought",
          agent: "Synthesizer",
          message: "Evaluating synthetic feasibility... The addition of a hydroxyl group at the tertiary carbon is synthetically challenging. Recommendation: Consider alternative positions or protecting group strategies. However, the route is feasible with 3-4 steps from the parent compound.",
          timestamp: Date.now() + 4000,
        },
        {
          type: "agent_thought",
          agent: "Designer",
          message: "Based on Synthesizer feedback, I propose an alternative: introducing a carboxylic acid group on the aromatic ring instead. This is synthetically more accessible. New proposal: `CC(C)(C(=O)O)c1ccc(cc1)C(O)CCCN2CCC(CC2)C(O)(c3ccc(C(=O)O)cc3)c4ccccc4`",
          timestamp: Date.now() + 6000,
        },
        {
          type: "agent_thought",
          agent: "Validator",
          message: "Validating revised structure... Excellent! LogP now 3.9, significantly improved. Molecular weight 568.7, still within range. Tanimoto similarity 0.82. All constraints satisfied. This is a strong candidate.",
          timestamp: Date.now() + 8000,
        },
        {
          type: "final_report",
          data: {
            // --- Propiedades que faltaban ---
            status: "Success", // Añade un estado
            history: [         // Añade un historial (puedes usar los 'thoughts')
              "Analyzing the starting molecule...",
              "Validating the proposed structure...",
              "Evaluating synthetic feasibility...",
              "Based on Synthesizer feedback, I propose an alternative...",
              "Validating revised structure... This is a strong candidate."
            ],
            attempts: 2, // Añade un número de intentos

            // --- Propiedades que ya tenías ---
            final_smiles: "CC(C)(C(=O)O)c1ccc(cc1)C(O)CCCN2CCC(CC2)C(O)(c3ccc(C(=O)O)cc3)c4ccccc4",
            
            // --- Propiedad renombrada ---
            validation: { // Renombrado de 'verifiable_data' a 'validation'
              starting_molecule: {
                smiles: params.smiles,
                logP: 4.8,
                molecular_weight: 501.7,
              },
              final_molecule: {
                smiles: "CC(C)(C(=O)O)c1ccc(cc1)C(O)CCCN2CCC(CC2)C(O)(c3ccc(C(=O)O)cc3)c4ccccc4",
                logP: 3.9,
                molecular_weight: 568.7,
              },
              // ...el resto de tus datos de 'verifiable_data'
            },
            
            // La propiedad 'executive_summary' debe ser eliminada
            // porque el tipo no la espera.
          },
        },
      ];

      for (let i = 0; i < mockMessages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        setMessages(prev => [...prev, mockMessages[i]]);
        if (i === mockMessages.length - 1) {
          setIsRunning(false);
          toast.success("Research complete!");
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
