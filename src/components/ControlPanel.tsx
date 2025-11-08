import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ControlPanelProps {
  onRunCrew: (params: ResearchParams) => void;
  isRunning: boolean;
}

export interface ResearchParams {
  smiles: string;
  goal: string;
  similarity: number;
  mwMin: number;
  mwMax: number;
}

const EXAMPLE_SMILES = "CC(C)(C(=O)O)c1ccc(cc1)C(O)CCCN2CCC(CC2)C(O)(c3ccccc3)c4ccccc4";

export const ControlPanel = ({ onRunCrew, isRunning }: ControlPanelProps) => {
  const [smiles, setSmiles] = useState("");
  const [goal, setGoal] = useState("");
  const [similarity, setSimilarity] = useState([0.7]);
  const [mwMin, setMwMin] = useState(200);
  const [mwMax, setMwMax] = useState(800);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smiles || !goal) return;
    
    onRunCrew({
      smiles,
      goal,
      similarity: similarity[0],
      mwMin,
      mwMax,
    });
  };

  const loadExample = () => {
    setSmiles(EXAMPLE_SMILES);
  };

  return (
    <Card className="h-full flex flex-col border-border shadow-medium">
      <div className="border-b border-border bg-gradient-subtle p-4">
         <Tooltip>
    <TooltipTrigger>
        <h2 className="text-xl font-semibold text-foreground">Control Panel</h2>
        </TooltipTrigger>
    <TooltipContent>
        <p className="text-sm text-muted-foreground mt-1">Define your molecular optimization task</p>
        </TooltipContent>
  </Tooltip>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Tooltip>
    <TooltipTrigger>
            <Label htmlFor="smiles" className="text-sm font-medium">
              Enter Starting SMILES String
            </Label>
            </TooltipTrigger>
            <TooltipContent>
        <p className="text-sm text-muted-foreground mt-1">Paste or type the SMILES string that will be used as the structural starting point for optimization.</p>
        </TooltipContent>
  </Tooltip>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadExample}
              disabled={isRunning}
              className="text-xs"
            >
              Load Fexofenadine Example
            </Button>
          </div>
          <Input
            id="smiles"
            value={smiles}
            onChange={(e) => setSmiles(e.target.value)}
            placeholder="Enter SMILES notation..."
            disabled={isRunning}
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Tooltip>
    <TooltipTrigger>
          <Label htmlFor="goal" className="text-sm font-medium">
            Optimization Goal
          </Label>
          </TooltipTrigger>
          <TooltipContent>
        <p className="text-sm text-muted-foreground mt-1">Select the property or performance metric you want the AI to improve.</p>
        </TooltipContent>
  </Tooltip>
          <Select value={goal} onValueChange={setGoal} disabled={isRunning}>
            <SelectTrigger id="goal">
              <SelectValue placeholder="Select optimization goal..." />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectGroup>
                <SelectLabel className="text-muted-foreground">Physicochemical Properties</SelectLabel>
                {/* --- MODIFIED VALUES --- */}
                <SelectItem value="Decrease LogP">Decrease LogP (Make more hydrophilic)</SelectItem>
                <SelectItem value="Increase LogP">Increase LogP (Make more lipophilic)</SelectItem>
                {/* Note: Your graph.py router only checks for the two LogP goals.
                  You will need to add router logic for these other goals to make them work.
                */}
                <SelectItem value="Decrease TPSA">Decrease Polar Surface Area (TPSA)</SelectItem>
                <SelectItem value="Increase TPSA">Increase Polar Surface Area (TPSA)</SelectItem>
                <SelectItem value="Decrease MW">Decrease Molecular Weight</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-muted-foreground">Structural Features</SelectLabel>
                <SelectItem value="Add Aromatic Ring">Add exactly one Aromatic Ring</SelectItem>
                <SelectItem value="Remove Aromatic Ring">Remove an Aromatic Ring</SelectItem>
                <SelectItem value="Increase HBD">Increase Hydrogen Bond Donors</SelectItem>
                <SelectItem value="Decrease HBD">Decrease Hydrogen Bond Donors</SelectItem>
                <SelectItem value="Increase HBA">Increase Hydrogen Bond Acceptors</SelectItem>
                <SelectItem value="Decrease HBA">Decrease Hydrogen Bond Acceptors</SelectItem>
                <SelectItem value="Decrease Rotatable Bonds">Decrease Rotatable Bonds (Make more rigid)</SelectItem>
                <SelectItem value="Increase Rotatable Bonds">Increase Rotatable Bonds (Make more flexible)</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-muted-foreground">"Big Bet" Goals</SelectLabel>
                <SelectItem value="Improve Lipinski">Improve 'Lipinski's Rule of 5' Profile</SelectItem>
                <SelectItem value="Decrease Toxicity">Decrease Predicted Toxicity</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
         <Tooltip>
    <TooltipTrigger>
          <h3 className="text-sm font-semibold text-foreground">Guardrails</h3>
          </TooltipTrigger>
          <TooltipContent>
        <p className="text-sm text-muted-foreground mt-1">Set structural similarity constraints to control how much the AI is allowed to modify the molecule.</p>
        </TooltipContent>
  </Tooltip>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Tooltip>
    <TooltipTrigger>
              <Label htmlFor="similarity" className="text-sm font-medium">
                Minimum Tanimoto Similarity
              </Label>
              </TooltipTrigger>
              <TooltipContent>
        <p className="text-sm text-muted-foreground mt-1">Define how structurally similar the optimized molecules must remain to the original:</p>
        <p className="text-sm text-muted-foreground mt-1">Higher values (e.g., 0.7): Closer chemical structure (minor modifications).</p>
        <p className="text-sm text-muted-foreground mt-1">Lower values (e.g., 0.3): Allows larger structural changes.</p>
        </TooltipContent>
  </Tooltip>
              <span className="text-sm font-mono text-muted-foreground">
                {similarity[0].toFixed(2)}
              </span>
            </div>
            <Slider
              id="similarity"
              min={0}
              max={1}
              step={0.05}
              value={similarity}
              onValueChange={setSimilarity}
              disabled={isRunning}
              className="py-2"
            />
          </div>

          <div className="space-y-2">
            <Tooltip>
    <TooltipTrigger>
            <Label className="text-sm font-medium">Molecular Weight Range</Label>
            </TooltipTrigger>
            <TooltipContent>
        <p className="text-sm text-muted-foreground mt-1">Restrict the size of generated molecules to practical or desired ranges.</p>
         <p className="text-sm text-muted-foreground mt-1">Prevents the AI from proposing molecules that are too small (unstable) or too large (pharmacologically poor).</p>
        </TooltipContent>
  </Tooltip>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mw-min" className="text-xs text-muted-foreground">
                  Min
                </Label>
                <Input
                  id="mw-min"
                  type="number"
                  value={mwMin}
                  onChange={(e) => setMwMin(Number(e.target.value))}
                  disabled={isRunning}
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mw-max" className="text-xs text-muted-foreground">
                  Max
                </Label>
                <Input
                  id="mw-max"
                  type="number"

                  value={mwMax}
                  onChange={(e) => setMwMax(Number(e.target.value))}
                  disabled={isRunning}
                  min={0}
                />
              </div>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isRunning || !smiles || !goal}
          className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Research Crew Running...
            </>
          ) : (
            "Run Research Crew"
          )}
        </Button>
      </form>
    </Card>
  );
};