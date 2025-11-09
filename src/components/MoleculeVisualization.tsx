import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface MoleculeVisualizationProps {
  smiles: string;
}

export const MoleculeVisualization = ({ smiles }: MoleculeVisualizationProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchVisualization = async () => {
      try {
        setLoading(true);
        setError(false);
        
        
        const response = await fetch(`/api/visualize?smiles=${encodeURIComponent(smiles)}`);
        if (!response.ok) throw new Error('Failed to fetch visualization');
          const blob = await response.blob();
          setImageUrl(URL.createObjectURL(blob));
        
        
        
      } catch (err) {
        console.error("Error fetching molecule visualization:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (smiles) {
      fetchVisualization();
    }

    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [smiles]);

  if (loading) {
    return (
      <Card className="p-6 bg-muted/30 border-border flex items-center justify-center min-h-[200px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Rendering molecule structure...</p>
        </div>
      </Card>
    );
  }

  if (error || !imageUrl) {
    return (
      <Card className="p-6 bg-destructive/5 border-destructive/20">
        <p className="text-sm text-destructive">Failed to render molecule visualization</p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">{smiles}</p>
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
      <div className="p-3 bg-muted/30 border-t border-border">
        <p className="text-xs text-muted-foreground font-mono truncate" title={smiles}>
          {smiles}
        </p>
      </div>
    </Card>
  );
};