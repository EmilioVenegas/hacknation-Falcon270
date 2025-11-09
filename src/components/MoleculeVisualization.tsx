import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // <-- Import Badge

interface MoleculeVisualizationProps {
  smiles: string;
}

export const MoleculeVisualization = ({ smiles }: MoleculeVisualizationProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saScore, setSaScore] = useState<number | null>(null); // <-- New state
  const [loadingImage, setLoadingImage] = useState(true); // <-- Renamed
  const [loadingScore, setLoadingScore] = useState(true); // <-- New state
  const [error, setError] = useState(false);

  useEffect(() => {
    // --- Reset states on new SMILES ---
    setLoadingImage(true);
    setLoadingScore(true);
    setError(false);
    setImageUrl(null);
    setSaScore(null);

    if (!smiles) {
      setLoadingImage(false);
      setLoadingScore(false);
      return;
    }

    let isCancelled = false;

    // --- Fetch 1: Visualization ---
    const fetchVisualization = async () => {
      try {
        const response = await fetch(`/api/visualize?smiles=${encodeURIComponent(smiles)}`);
        if (isCancelled) return;
        if (!response.ok) throw new Error('Failed to fetch visualization');
        const blob = await response.blob();
        setImageUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.error("Error fetching molecule visualization:", err);
        if (!isCancelled) setError(true);
      } finally {
        if (!isCancelled) setLoadingImage(false);
      }
    };

    // --- Fetch 2: SA Score ---
    const fetchSaScore = async () => {
      try {
        const response = await fetch(`/api/get-sa-score?smiles=${encodeURIComponent(smiles)}`);
        if (isCancelled) return;
        if (!response.ok) throw new Error('Failed to fetch SA score');
        const data = await response.json();
        if (data.valid) {
          setSaScore(data.sa_score);
        } else {
          throw new Error(data.error || 'Invalid SMILES for scoring');
        }
      } catch (err) {
        console.error("Error fetching SA score:", err);
        if (!isCancelled) setError(true); // Also set error if score fails
      } finally {
        if (!isCancelled) setLoadingScore(false);
      }
    };

    fetchVisualization();
    fetchSaScore();

    return () => {
      isCancelled = true;
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [smiles]); // Dependency is correct

  const isLoading = loadingImage || loadingScore;

  if (isLoading) {
    return (
      <Card className="p-6 bg-muted/30 border-border flex items-center justify-center min-h-[200px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Rendering molecule data...</p>
        </div>
      </Card>
    );
  }

  if (error || !imageUrl) {
    return (
      <Card className="p-4 bg-destructive/5 border-destructive/20 shadow-soft">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              Invalid SMILES String
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono truncate" title={smiles}>
              {smiles}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border shadow-soft">
      <img 
        src={imageUrl} 
        alt={`Molecule structure: ${smiles}`}
        className="w-full h-auto"
      />
      <div className="p-3 bg-muted/30 border-t border-border space-y-2">
        <p className="text-xs text-muted-foreground font-mono truncate" title={smiles}>
          {smiles}
        </p>
        {saScore !== null && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Synthesizability (SA) Score:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {saScore.toFixed(2)}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};