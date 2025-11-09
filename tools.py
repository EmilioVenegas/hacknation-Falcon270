import io
from rdkit import Chem, DataStructs
from rdkit.Chem import Descriptors, Crippen, Draw, QED # Import QED
import sascorer
from crewai.tools import tool

# --- RDKit Tooling ---
# All functions that return a string are designed to be used by the Validator agent.

@tool
def get_is_smiles_string_valid(smiles: str) -> str:
    """
    Checks if a SMILES string is chemically valid.
    Returns 'Valid' or an error message.
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return "Invalid SMILES string."
    return "Valid"

@tool
def get_logp(smiles: str) -> str:
    """Returns the Crippen LogP value of the molecule."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return "Invalid SMILES"
    logp = Crippen.MolLogP(mol)
    return f"{logp:.4f}"

@tool
def get_similarity(smiles_1: str, smiles_2: str) -> str:
    """
    Returns the Tanimoto similarity between two molecules.
    smiles_1 is the original molecule, smiles_2 is the new one.
    """
    mol_1 = Chem.MolFromSmiles(smiles_1)
    mol_2 = Chem.MolFromSmiles(smiles_2)
    if mol_1 is None or mol_2 is None:
        return "Invalid SMILES"
    
    fp_gen = Chem.rdFingerprintGenerator.GetMorganGenerator()
    fp_1 = fp_gen.GetFingerprint(mol_1)
    fp_2 = fp_gen.GetFingerprint(mol_2)
    similarity = DataStructs.TanimotoSimilarity(fp_1, fp_2)
    return f"{similarity:.4f}"

@tool
def get_aromatic_rings(smiles: str) -> str:
    """Returns the number of aromatic rings in the molecule."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return "Invalid SMILES"
    rings = Descriptors.rdMolDescriptors.CalcNumAromaticRings(mol)
    return f"{rings}"

@tool
def get_molecular_weight(smiles: str) -> str:
    """Returns the Molecular Weight of the molecule."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return "Invalid SMILES"
    mw = Descriptors.MolWt(mol)
    return f"{mw:.4f}"

@tool
def get_tpsa(smiles: str) -> str:
    """Returns the Total Polar Surface Area (TPSA) of the molecule."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return "Invalid SMILES"
    tpsa = Descriptors.TPSA(mol)
    return f"{tpsa:.4f}"

@tool
def get_h_bond_donors(smiles: str) -> str:
    """Returns the number of Hydrogen Bond Donors."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return "Invalid SMILES"
    donors = Descriptors.NumHDonors(mol)
    return f"{donors}"

@tool
def get_h_bond_acceptors(smiles: str) -> str:
    """Returns the number of Hydrogen Bond Acceptors."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return "Invalid SMILES"
    acceptors = Descriptors.NumHAcceptors(mol)
    return f"{acceptors}"

@tool
def get_rotatable_bonds(smiles: str) -> str:
    """Returns the number of Rotatable Bonds."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return "Invalid SMILES"
    bonds = Descriptors.NumRotatableBonds(mol)
    return f"{bonds}"

@tool
def get_lipinski_violations(smiles: str) -> str:
    """
    Returns the number of Lipinski's Rule of 5 violations.
    Rules: MW <= 500, LogP <= 5, H-Donors <= 5, H-Acceptors <= 10.
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return "Invalid SMILES"
    
    mw = Descriptors.MolWt(mol)
    logp = Crippen.MolLogP(mol)
    donors = Descriptors.NumHDonors(mol)
    acceptors = Descriptors.NumHAcceptors(mol)
    
    violations = 0
    if mw > 500:
        violations += 1
    if logp > 5:
        violations += 1
    if donors > 5:
        violations += 1
    if acceptors > 10:
        violations += 1
        
    return f"{violations}"
@tool
def get_sa_score(smiles: str) -> str:
    """
    Returns the Synthesizability (SA) Score.
    Ranges from 1 (easy to synthesize) to 10 (hard to synthesize).
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return "Invalid SMILES"
    sa_score = sascorer.calculateScore(mol)
    return f"{sa_score:.4f}"

@tool
def get_qed(smiles: str) -> str:
    """
    Returns the Quantitative Estimate of Drug-likeness (QED) of the molecule.
    The QED score is between 0 (low) and 1 (high).
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return "Invalid SMILES"
    
    qed_score = QED.qed(mol)
    return f"{qed_score:.4f}"

static_tools = [
    get_is_smiles_string_valid,
    get_logp,
    get_similarity,
    get_aromatic_rings,
    get_molecular_weight,
    get_tpsa,
    get_h_bond_donors,
    get_h_bond_acceptors,
    get_rotatable_bonds,
    get_lipinski_violations,
    get_sa_score,
    get_qed,
]

# --- Visualization Helper (Not a tool) ---

def visualize_molecule_to_png(smiles: str) -> bytes:
    """
    Generates a PNG image of a molecule from a SMILES string.
    Returns bytes of the PNG.
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        # Create a placeholder image for invalid SMILES
        img = Draw.MolToImage(Chem.MolFromSmiles(""), size=(300, 300))
        d = Draw.Draw2DCANVAS(300, 300, -1, -1)
        d.drawOptions().addAtomIndices = False
        d.drawOptions().addStereoAnnotation = False
        d.SetFontSize(1.2)
        d.DrawString("Invalid\nSMILES", (100, 150))
        d.FinishDrawing()
        img_data = d.GetDrawingText()
        buffer = io.BytesIO(img_data)
        return buffer.getvalue()
        
    img = Draw.MolToImage(mol, size=(300, 300))
    
    # Save image to a bytes buffer
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return buffer.getvalue()