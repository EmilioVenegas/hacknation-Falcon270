import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { MoleculeVisualization } from "./MoleculeVisualization"; // <-- Import visualization
import { Switch } from "@/components/ui/switch"; // <-- Import Switch
import { Separator } from "@/components/ui/separator"; // <-- Import Separator
import { cn } from "@/lib/utils"; // <-- Import cn

interface ControlPanelProps {
  onRunCrew: (params: ResearchParams) => void;
  isRunning: boolean;
}

export interface ResearchParams {
  smiles: string;
  goal: string;
  similarity: number;
  isMwEnabled: boolean; // <-- Add this
  mwMin: number;
  mwMax: number;
  isSaScoreEnabled: boolean; // <-- Add this
  saScore: number; // <-- Add this
}

const EXAMPLE_SMILES = "CC(C)(C(=O)O)c1ccc(cc1)C(O)CCCN2CCC(CC2)C(O)(c3ccccc3)c4ccccc4";

export const ControlPanel = ({ onRunCrew, isRunning }: ControlPanelProps) => {
  const [smiles, setSmiles] = useState("");
  const [goal, setGoal] = useState("");
  const [similarity, setSimilarity] = useState([0.7]);
  const [mwMin, setMwMin] = useState(200);
  const [mwMax, setMwMax] = useState(800);
  const [isMwEnabled, setIsMwEnabled] = useState(false); 
  const [isSaScoreEnabled, setIsSaScoreEnabled] = useState(false); 
  const [saScore, setSaScore] = useState([5.0]); 

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smiles || !goal) return;
    
    onRunCrew({
      smiles,
      goal,
      similarity: similarity[0],
      isMwEnabled,
      mwMin,
      mwMax,
      isSaScoreEnabled,
      saScore: saScore[0], 
    });
  };

  const loadExample = () => {
    setSmiles(EXAMPLE_SMILES);
  };

  return (
    <Card className="h-full flex flex-col border-border shadow-medium">
      <div className="border-b border-border bg-gradient-subtle p-4">
        <h2 className="text-xl font-semibold text-foreground">Control Panel</h2>
        <p className="text-sm text-muted-foreground mt-1">Define your molecular optimization task</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="smiles" className="text-sm font-medium">
              Enter Starting SMILES String
            </Label>
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
          {/* --- NEW: Show molecule visualization --- */}
          {smiles && (
            <div className="pt-4">
              <MoleculeVisualization smiles={smiles} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal" className="text-sm font-medium">
            Optimization Goal
          </Label>
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
          <h3 className="text-sm font-semibold text-foreground">Guardrails</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="similarity" className="text-sm font-medium">
                Minimum Tanimoto Similarity
              </Label>
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

          {/* --- NEW: Synthesizability Score --- */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="sa-score-toggle" className="text-sm font-medium">
                Enable Synthesizability (SA) Score
              </Label>
              <Switch
                id="sa-score-toggle"
                checked={isSaScoreEnabled}
                onCheckedChange={setIsSaScoreEnabled}
                disabled={isRunning}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sa-score" className={cn("text-sm font-medium", !isSaScoreEnabled && "opacity-50")}>
                Max SA Score (Lower is better)
              </Label>
              <span className={cn("text-sm font-mono text-muted-foreground", !isSaScoreEnabled && "opacity-50")}>
                {saScore[0].toFixed(1)}
              </span>
            </div>
            <Slider
              id="sa-score"
              min={1}
              max={10}
              step={0.5}
              value={saScore}
              onValueChange={setSaScore}
              disabled={!isSaScoreEnabled || isRunning}
              className="py-2"
            />
          </div>
          {/* --- END NEW --- */}

          {/* --- MODIFIED: Molecular Weight Range --- */}
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="mw-toggle" className="text-sm font-medium">
                Enable Molecular Weight Guardrail
              </Label>
              <Switch
                id="mw-toggle"
                checked={isMwEnabled}
                onCheckedChange={setIsMwEnabled}
                disabled={isRunning}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label htmlFor="mw-min" className={cn("text-xs text-muted-foreground", !isMwEnabled && "opacity-50")}>
                  Min
                </Label>
                <Input
                  id="mw-min"
                  type="number"
                  value={mwMin}
                  onChange={(e) => setMwMin(Number(e.target.value))}
                  disabled={!isMwEnabled || isRunning}
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mw-max" className={cn("text-xs text-muted-foreground", !isMwEnabled && "opacity-50")}>
                  Max
                </Label>
                <Input
                  id="mw-max"
                  type="number"
                  value={mwMax}
                  onChange={(e) => setMwMax(Number(e.target.value))}
                  disabled={!isMwEnabled || isRunning}
                  min={0}
                />
              </div>
            </div>
          </div>
          {/* --- END MODIFIED --- */}
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