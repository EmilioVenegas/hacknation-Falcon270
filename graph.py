import os
import json
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from crewai import Agent, Task, Crew
from crewai.llm import LLM
from dotenv import load_dotenv
# --- MODIFIED IMPORTS ---
# Import all the tools we will need for validation and routing
from tools import (
    static_tools, get_is_smiles_string_valid, get_logp, get_similarity,
    get_molecular_weight, get_tpsa, get_aromatic_rings, get_h_bond_donors,
    get_h_bond_acceptors, get_rotatable_bonds, get_lipinski_violations,
    get_qed # <<-- NEW QED TOOL
)

# --- Load API Key ---
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in .env file. Please create a .env file and add it.")

# --- Define Model ---
llm = LLM(model="gemini/gemini-2.5-flash")

# --- Define Graph State ---
class ResearchState(TypedDict):
    input_smiles: str
    optimization_goal: str
    constraints: Dict[str, Any]
    proposed_smiles: str
    validation_results: Dict[str, Any]
    conversation_history: List[str]
    final_report: Dict[str, Any]
    retries: int
    max_retries: int
    similarity_failures: int
    max_similarity_failures: int

# --- Helper Function to Get All Properties ---
def _get_all_properties(smiles: str, original_smiles: str = None) -> Dict[str, Any]:
    """Helper to get all molecular properties, returning floats/ints for easy comparison."""
    if get_is_smiles_string_valid.run(smiles) != "Valid":
        return {"is_valid": False}

    props = {
        "is_valid": True,
        "logp": float(get_logp.run(smiles)),
        "mw": float(get_molecular_weight.run(smiles)),
        "tpsa": float(get_tpsa.run(smiles)),
        "aromatic_rings": int(get_aromatic_rings.run(smiles)),
        "hbd": int(get_h_bond_donors.run(smiles)),
        "hba": int(get_h_bond_acceptors.run(smiles)),
        "rotatable_bonds": int(get_rotatable_bonds.run(smiles)),
        "lipinski_violations": int(get_lipinski_violations.run(smiles)),
        "qed": float(get_qed.run(smiles)), # <<-- ADDED QED
    }
    
    if original_smiles:
        # Only calculate similarity for the proposed molecule against the original
        props["similarity"] = float(get_similarity.run(smiles_1=original_smiles, smiles_2=smiles))
        
    return props

# --- Define Agents ---

designer_agent = Agent(
    role="Medicinal Chemist Designer",
    goal="""Generate a new, novel SMILES string that attempts to fulfill the optimization_goal,
    based on the input_smiles and conversation_history.
    You MUST ONLY output the new SMILES string and nothing else.""",
    backstory="You are an expert medicinal chemist AI. You are a creative genius at modifying molecular structures. You never explain your reasoning, you just provide the SMILES string.",
    llm=llm,
    tools=[],
    verbose=True
)

validator_agent = Agent(
    role="Cheminformatics Validator",
    goal="""Critically analyze the proposed_smiles using all available tools.
    Check the results against the user's constraints.
    Provide a clear, one-paragraph summary of all validation results and whether the constraints were met.
    You must now include the QED score in your analysis.""", # <<-- UPDATED GOAL
    backstory="You are a meticulous, data-driven AI. You trust only the numbers. You check every property of a molecule and compare it to the requirements.",
    llm=llm,
    tools=static_tools,
    verbose=True
)

synthesizer_agent = Agent(
    role="Lead Research Analyst",
    goal="""Compile all validation_results, conversation_history, and the final proposed_smiles
    into a structured JSON report. If a successful molecule was found, set status 'Success'.
    If the retry limit was hit, set status to 'Failure'.""",
    backstory="You are the lead analyst responsible for summarizing the R&D cycle. Your job is to create the final, clean report for the frontend.",
    llm=llm,
    tools=[],
    verbose=True
)

# --- Define Agent Nodes ---

def designer_node(state: ResearchState) -> ResearchState:
    prompt = f"""
    The user's original molecule is: {state['input_smiles']}
    The user's goal is: {state['optimization_goal']}
    The constraints are: {json.dumps(state['constraints'])}
    The conversation history is:
    {"\n".join(state['conversation_history'])}

    Based on this, propose a new, valid SMILES string. Output ONLY the SMILES string.
    """
    task = Task(description=prompt, agent=designer_agent, expected_output="A single SMILES string.")
    crew = Crew(
        agents=[designer_agent],
        tasks=[task],
        verbose=False
    )
    
    crew_output = crew.kickoff()
    
    # Check if crew_output has raw attribute, and it's a string
    if hasattr(crew_output, 'raw') and isinstance(crew_output.raw, str):
        new_smiles_raw = crew_output.raw
    elif isinstance(crew_output, str):
        # Fallback in case kickoff() *does* return a string (older versions)
        new_smiles_raw = crew_output
    else:
        # Handle unexpected output, e.g., log it and use a placeholder
        print(f"Warning: Unexpected crew output type: {type(crew_output)}")
        # You might want to force a retry or failure here
        new_smiles_raw = "" # or raise an exception
        
    cleaned_smiles = new_smiles_raw.strip().replace("`", "").replace("python", "").replace("\n", "")
    state['proposed_smiles'] = cleaned_smiles
    state['retries'] += 1
    state['conversation_history'].append(f"Designer (Attempt {state['retries']}): Proposed {cleaned_smiles}")
    return state

def validator_node(state: ResearchState) -> ResearchState:
    smiles = state['proposed_smiles']
    original_smiles = state['input_smiles']
    
    # --- MODIFIED: Request QED in prompt ---
    prompt = f"""
    Validate the proposed SMILES string: {smiles}
    Original SMILES for comparison: {original_smiles}
    You MUST use your tools to find all of the following properties:
    LogP, TPSA, Molecular Weight, Aromatic Rings, H-Bond Donors, H-Bond Acceptors,
    Rotatable Bonds, Lipinski Violations, QED, and Similarity to the original.
    After getting all data, write a one-paragraph summary.
    """
    task = Task(description=prompt, agent=validator_agent, expected_output="A one-paragraph summary of all validation data.")
    crew = Crew(
        agents=[validator_agent],
        tasks=[task],
        verbose=False
    )
    
    crew_output = crew.kickoff()

    if hasattr(crew_output, 'raw') and isinstance(crew_output.raw, str):
        validation_summary = crew_output.raw
    elif isinstance(crew_output, str):
        validation_summary = crew_output
    else:
        print(f"Warning: Unexpected crew output type: {type(crew_output)}")
        validation_summary = "Error: Could not get validation summary from agent."
        
    # --- MODIFIED: Use helper to gather all data for proposed and original ---
    results = _get_all_properties(smiles, original_smiles=original_smiles)
    
    if results['is_valid']:
        # Store original properties separately for front-end comparison (needed for chart)
        original_props = _get_all_properties(original_smiles)
        
        # Merge results for proposed molecule with validation summary
        results.update({
            "summary": validation_summary,
            "original_props": original_props, 
        })
    else:
        results["summary"] = validation_summary # Keep error message
        
    state['validation_results'] = results
    state['conversation_history'].append(f"Validator: {validation_summary}")
    return state

def synthesizer_node(state: ResearchState) -> ResearchState:
    # This node formats the final report based on the final state
    status = "Failure"
    # Check if the router set meets_constraints to True
    if state['validation_results'].get("meets_constraints", False):
        status = "Success"
        
    status_message = "Research complete. Compiling final report." if status == "Success" else "Research failed. Compiling final report."
    state['conversation_history'].append(f"Synthesizer: {status_message}")

    # --- NEW: Synthesizer generates an Executive Summary ---
    summary_prompt = f"""
    You are the Lead Research Analyst. Your task is to write a comprehensive, professional, 
    multi-paragraph Executive Summary (between 150-250 words) based on the following R&D cycle results:

    1. **Initial Molecule (SMILES)**: {state['input_smiles']}
    2. **Optimization Goal**: {state['optimization_goal']}
    3. **Final Status**: {status}
    4. **Final Proposed Molecule (SMILES)**: {state['proposed_smiles']}
    5. **Final Validation Data (JSON)**: {json.dumps(state['validation_results'], indent=2)}
    
    The summary must cover:
    - The initial problem (goal and starting molecule).
    - The success or failure of the outcome.
    - Key findings from the validation data (e.g., how the new molecule's LogP changed, if MW was within range, the final SA Score, etc.).
    - A concluding sentence on the significance of the result.
    
    Output ONLY the Executive Summary text.
    """
    
    summary_task = Task(
        description=summary_prompt,
        agent=synthesizer_agent,
        expected_output="A single, multi-paragraph executive summary."
    )
    
    crew = Crew(
        agents=[synthesizer_agent],
        tasks=[summary_task],
        verbose=False
    )
    
    # Run the Synthesizer task to get the summary
    executive_summary_raw = crew.kickoff()
    
    # Extract raw summary from crew output
    if hasattr(executive_summary_raw, 'raw') and isinstance(executive_summary_raw.raw, str):
        executive_summary = executive_summary_raw.raw
    elif isinstance(executive_summary_raw, str):
        executive_summary = executive_summary_raw
    else:
        executive_summary = "Error: Could not generate executive summary."
    
    state['conversation_history'].append(f"Synthesizer: Generated Executive Summary.")
    # --- END NEW: Synthesizer generates an Executive Summary ---

    report = {
        "status": status,
        "final_smiles": state['proposed_smiles'],
        "validation": state['validation_results'],
        "history": state['conversation_history'],
        "attempts": state['retries'],
        "executive_summary": executive_summary,
    }

    state['final_report'] = report
    return state

# --- Define Graph Router ---

def should_continue(state: ResearchState) -> str:
    # Hard stop 1: Max retries
    if state['retries'] >= state['max_retries']:
        state['validation_results']['summary'] = "Failure: Max retries reached."
        state['validation_results']['meets_constraints'] = False
        return "synthesize"

    results = state['validation_results']
    constraints = state['constraints']
    goal = state['optimization_goal']
    
    # Get original properties (now included in validation_results)
    original_props = results.get('original_props', {})
    
    # Hard stop 2: Invalid SMILES
    if not results.get("is_valid", False):
        state['conversation_history'].append("Router: Invalid SMILES. Retrying.")
        return "design"

    # Hard stop 3: Similarity constraint (with improved loop-breaking logic)
    min_similarity = constraints.get("similarity", 0.0)
    if results.get("similarity", 1.0) < min_similarity:
        state['similarity_failures'] = state.get('similarity_failures', 0) + 1 # Use .get for robustness
        
        if state['similarity_failures'] >= state['max_similarity_failures']:
            # Reset counter and dynamically reduce threshold to encourage escape
            new_min = max(0.4, min_similarity - 0.1)
            state['constraints']['similarity'] = new_min
            state['similarity_failures'] = 0
            
            state['conversation_history'].append(
                f"Router: Hit max similarity failures ({state['max_similarity_failures']}). "
                f"Temporarily reducing target minimum similarity from {min_similarity:.2f} to {new_min:.2f} to encourage exploration."
            )
        else:
             state['conversation_history'].append(f"Router: Similarity {results['similarity']:.4f} is below threshold {min_similarity:.2f}. Retrying.")
        
        return "design"
    else:
        # Reset similarity failure counter if a valid design is produced
        state['similarity_failures'] = 0


    # Hard stop 4: Molecular Weight constraints
    mwMin = constraints.get("mwMin", 0)
    mwMax = constraints.get("mwMax", 1000)
    mw = results.get("mw", 0)
    if not (mwMin <= mw <= mwMax):
        state['conversation_history'].append(f"Router: MW {mw:.2f} is outside allowed range ({mwMin}-{mwMax}). Retrying.")
        return "design"

    # --- GOAL CHECKING (Updated with QED/Toxicity Logic) ---
    goal_met = False
    failure_message = ""

    try:
        # Helper for common value comparisons
        def compare_values(prop_name, operator):
            nonlocal goal_met, failure_message
            # Use original_props for clean original values, results for new values
            original_val = original_props.get(prop_name, float('inf')) 
            new_val = results.get(prop_name, float('-inf'))
            
            if original_val == float('inf') or new_val == float('-inf'):
                # Failsafe if data is missing
                return False 
                
            if operator == '>':
                if new_val > original_val:
                    goal_met = True
                else:
                    failure_message = f"New {prop_name} {new_val:.4f} is not greater than original {original_val:.4f}."
            elif operator == '<':
                if new_val < original_val:
                    goal_met = True
                else:
                    failure_message = f"New {prop_name} {new_val:.4f} is not less than original {original_val:.4f}."
            return goal_met

        if "Decrease LogP" in goal:
            compare_values('logp', '<')

        elif "Increase LogP" in goal:
            compare_values('logp', '>')
        
        elif "Decrease TPSA" in goal:
            compare_values('tpsa', '<')

        elif "Increase TPSA" in goal:
            compare_values('tpsa', '>')
                
        elif "Decrease MW" in goal:
            compare_values('mw', '<')

        elif "Add Aromatic Ring" in goal:
            # Note: For integer values like rings/bonds, use explicit values or properties.
            original_val = original_props['aromatic_rings']
            new_val = results['aromatic_rings']
            if new_val == original_val + 1:
                goal_met = True
            else:
                failure_message = f"New Aromatic Rings {new_val} is not one more than original {original_val}."

        elif "Remove Aromatic Ring" in goal:
            original_val = original_props['aromatic_rings']
            new_val = results['aromatic_rings']
            if new_val == original_val - 1 and new_val >= 0:
                goal_met = True
            else:
                failure_message = f"New Aromatic Rings {new_val} is not one less than original {original_val}."

        elif "Increase HBD" in goal:
            compare_values('hbd', '>')
                
        elif "Decrease HBD" in goal:
            compare_values('hbd', '<')

        elif "Increase HBA" in goal:
            compare_values('hba', '>')

        elif "Decrease HBA" in goal:
            compare_values('hba', '<')

        elif "Decrease Rotatable Bonds" in goal:
            compare_values('rotatable_bonds', '<')
        
        elif "Increase Rotatable Bonds" in goal:
            compare_values('rotatable_bonds', '>')
        
        # --- COMBINED LIPINSKI / QED CHECK (Improved Drug-likeness) ---
        elif "Improve Lipinski" in goal or "Decrease Toxicity" in goal:
            original_violations = original_props['lipinski_violations']
            new_violations = results['lipinski_violations']
            original_qed = original_props['qed']
            new_qed = results['qed']
            
            # Improvement definition: Decreased violations OR significantly increased QED score
            violations_improved = new_violations < original_violations
            qed_improved = new_qed > original_qed # A QED increase of any amount counts as improvement
            
            # Also accept if QED is already high (e.g., > 0.9) and violations are low (e.g., <= 1)
            already_good = new_qed > 0.9 and new_violations <= 1
            
            if violations_improved or qed_improved or already_good:
                goal_met = True
            else:
                failure_message = (
                    f"Lipinski Violations ({new_violations}) did not decrease from original ({original_violations}). "
                    f"QED score ({new_qed:.4f}) did not improve from original ({original_qed:.4f})."
                )
                
        else:
            # Unrecognized goal is immediately deemed met, relying on hard constraints only.
            goal_met = True
            state['conversation_history'].append(f"Router: Unknown goal '{goal}'. Proceeding to final synthesis if constraints are met.")

    except Exception as e:
        state['conversation_history'].append(f"Router: Error during goal check: {e}. Retrying.")
        return "design"
        
    # Check if a verifiable goal failed the test
    verifiable_goals = [
        "Decrease LogP", "Increase LogP", "Decrease TPSA", "Increase TPSA", "Decrease MW", 
        "Add Aromatic Ring", "Remove Aromatic Ring", "Increase HBD", "Decrease HBD", 
        "Increase HBA", "Decrease HBA", "Decrease Rotatable Bonds", "Increase Rotatable Bonds", 
        "Improve Lipinski", "Decrease Toxicity"
    ]
    
    if goal in verifiable_goals and not goal_met:
        state['conversation_history'].append(f"Router: Goal not met. {failure_message} Retrying.")
        return "design"
            

    # Final check: If execution reached here, all hard stops failed and the goal must be met.
    state['validation_results']['meets_constraints'] = True
    state['conversation_history'].append("Router: All constraints and goals met. Proceeding to final synthesis.")
    return "synthesize"

# --- Compile Graph ---
builder = StateGraph(ResearchState)

builder.add_node("design", designer_node)
builder.add_node("validate", validator_node)
builder.add_node("synthesize", synthesizer_node)

builder.set_entry_point("design")

builder.add_edge("design", "validate")
builder.add_edge("synthesize", END)

builder.add_conditional_edges(
    "validate",
    should_continue,
    {
        "design": "design",
        "synthesize": "synthesize"
    }
)

compiled_graph = builder.compile()