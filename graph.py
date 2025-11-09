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
    get_sa_score 
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
    Provide a clear, one-paragraph summary of all validation results and whether the constraints were met.""",
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
    prompt = f"""
    Validate the proposed SMILES string: {smiles}
    Original SMILES for comparison: {original_smiles}
    You MUST use your tools to find all of the following properties:
    - get_is_smiles_string_valid
    - get_logp
    - get_tpsa
    - get_molecular_weight
    - get_aromatic_rings
    - get_h_bond_donors
    - get_h_bond_acceptors
    - get_rotatable_bonds
    - get_lipinski_violations
    - get_sa_score 
    - get_similarity

    After gathering all data, format the output *exactly* as follows, with each item on a new line:

    Validation Summary
    - Status: [Result from get_is_smiles_string_valid]
    - LogP: [Result from get_logp]
    - TPSA: [Result from get_tpsa]
    - Molecular Weight: [Result from get_molecular_weight]
    - Aromatic Rings: [Result from get_aromatic_rings]
    - H-Bond Donors: [Result from get_h_bond_donors]
    - H-Bond Acceptors: [Result from get_h_bond_acceptors]
    - Rotatable Bonds: [Result from get_rotatable_bonds]
    - Lipinski Violations: [Result from get_lipinski_violations]
    - SA Score: [Result from get_sa_score]
    - Tanimoto Similarity: [Result from get_similarity]
    - Analysis: [Your brief, one-sentence analysis of these results.]
    """
    
    task = Task(
        description=prompt,
        agent=validator_agent,
        expected_output="A multi-line formatted summary starting with 'Validation Summary' and followed by a bulleted list of all properties."
    )
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
        
    valid_str = get_is_smiles_string_valid.run(smiles)
    if valid_str != "Valid":
        results = {"is_valid": False, "summary": validation_summary}
    else:
        results = {
            "is_valid": True,
            "logp": float(get_logp.run(smiles)),
            "similarity": float(get_similarity.run(smiles_1=original_smiles, smiles_2=smiles)),
            "mw": float(get_molecular_weight.run(smiles)),
            "tpsa": float(get_tpsa.run(smiles)),
            "aromatic_rings": int(get_aromatic_rings.run(smiles)),
            "hbd": int(get_h_bond_donors.run(smiles)),
            "hba": int(get_h_bond_acceptors.run(smiles)),
            "rotatable_bonds": int(get_rotatable_bonds.run(smiles)),
            "lipinski_violations": int(get_lipinski_violations.run(smiles)),
            "sa_score": float(get_sa_score.run(smiles)), 
            "summary": validation_summary
        }
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

    report = {
        "status": status,
        "final_smiles": state['proposed_smiles'],
        "validation": state['validation_results'],
        "history": state['conversation_history'],
        "attempts": state['retries']
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
    original_smiles = state['input_smiles']

    # Hard stop 2: Invalid SMILES
    if not results.get("is_valid", False):
        state['conversation_history'].append("Router: Invalid SMILES. Retrying.")
        return "design"

    # Hard stop 3: Similarity constraint
    min_similarity = constraints.get("similarity", 0.0)
    if results.get("similarity", 1.0) < min_similarity:
        state['conversation_history'].append(f"Router: Similarity {results['similarity']} is below threshold {min_similarity}. Retrying.")
        return "design"

    # Hard stop 4: Molecular Weight constraints
    mwMin = constraints.get("mwMin", 0)
    mwMax = constraints.get("mwMax", 1000)
    mw = results.get("mw", 0)
    if not (mwMin <= mw <= mwMax):
        state['conversation_history'].append(f"Router: MW {mw} is outside allowed range ({mwMin}-{mwMax}). Retrying.")
        return "design"

    # --- NEW: Hard stop 5: SA Score constraint ---
    sa_score_constraint = constraints.get("saScore", 10.0) 
    current_sa_score = results.get("sa_score", 0.0)
    if current_sa_score > sa_score_constraint:
        state['conversation_history'].append(f"Router: SA Score {current_sa_score:.2f} is above threshold {sa_score_constraint:.2f}. Retrying.")
        return "design"

    # --- GOAL CHECKING ---
    goal_met = False
    failure_message = ""

    try:
        if "Decrease LogP" in goal:
            original_val = float(get_logp.run(original_smiles))
            new_val = results['logp']
            if new_val < original_val:
                goal_met = True
            else:
                failure_message = f"New LogP {new_val} is not less than original {original_val}."

        elif "Increase LogP" in goal:
            original_val = float(get_logp.run(original_smiles))
            new_val = results['logp']
            if new_val > original_val:
                goal_met = True
            else:
                failure_message = f"New LogP {new_val} is not greater than original {original_val}."
        
        elif "Decrease TPSA" in goal:
            original_val = float(get_tpsa.run(original_smiles))
            new_val = results['tpsa']
            if new_val < original_val:
                goal_met = True
            else:
                failure_message = f"New TPSA {new_val} is not less than original {original_val}."

        elif "Increase TPSA" in goal:
            original_val = float(get_tpsa.run(original_smiles))
            new_val = results['tpsa']
            if new_val > original_val:
                goal_met = True
            else:
                failure_message = f"New TPSA {new_val} is not greater than original {original_val}."
                
        elif "Decrease MW" in goal:
            original_val = float(get_molecular_weight.run(original_smiles))
            new_val = results['mw']
            if new_val < original_val:
                goal_met = True
            else:
                failure_message = f"New MW {new_val} is not less than original {original_val}."

        elif "Add Aromatic Ring" in goal:
            original_val = int(get_aromatic_rings.run(original_smiles))
            new_val = results['aromatic_rings']
            if new_val == original_val + 1: # Goal is specific: "Add *exactly one*"
                goal_met = True
            else:
                failure_message = f"New Aromatic Rings {new_val} is not one more than original {original_val}."

        elif "Remove Aromatic Ring" in goal:
            original_val = int(get_aromatic_rings.run(original_smiles))
            new_val = results['aromatic_rings']
            if new_val == original_val - 1 and new_val >= 0:
                goal_met = True
            else:
                failure_message = f"New Aromatic Rings {new_val} is not one less than original {original_val}."

        elif "Increase HBD" in goal:
            original_val = int(get_h_bond_donors.run(original_smiles))
            new_val = results['hbd']
            if new_val > original_val:
                goal_met = True
            else:
                failure_message = f"New HBD {new_val} is not greater than original {original_val}."
                
        elif "Decrease HBD" in goal:
            original_val = int(get_h_bond_donors.run(original_smiles))
            new_val = results['hbd']
            if new_val < original_val:
                goal_met = True
            else:
                failure_message = f"New HBD {new_val} is not less than original {original_val}."

        elif "Increase HBA" in goal:
            original_val = int(get_h_bond_acceptors.run(original_smiles))
            new_val = results['hba']
            if new_val > original_val:
                goal_met = True
            else:
                failure_message = f"New HBA {new_val} is not greater than original {original_val}."

        elif "Decrease HBA" in goal:
            original_val = int(get_h_bond_acceptors.run(original_smiles))
            new_val = results['hba']
            if new_val < original_val:
                goal_met = True
            else:
                failure_message = f"New HBA {new_val} is not less than original {original_val}."

        elif "Decrease Rotatable Bonds" in goal:
            original_val = int(get_rotatable_bonds.run(original_smiles))
            new_val = results['rotatable_bonds']
            if new_val < original_val:
                goal_met = True
            else:
                failure_message = f"New Rotatable Bonds {new_val} is not less than original {original_val}."
        
        elif "Increase Rotatable Bonds" in goal:
            original_val = int(get_rotatable_bonds.run(original_smiles))
            new_val = results['rotatable_bonds']
            if new_val > original_val:
                goal_met = True
            else:
                failure_message = f"New Rotatable Bonds {new_val} is not greater than original {original_val}."
        
        elif "Improve Lipinski" in goal:
            original_val = int(get_lipinski_violations.run(original_smiles))
            new_val = results['lipinski_violations']
            if new_val < original_val:
                goal_met = True
            else:
                failure_message = f"New Lipinski Violations {new_val} is not less than original {original_val}."

        elif "Decrease Toxicity" in goal:
            goal_met = True
            state['conversation_history'].append("Router: Goal is 'Decrease Toxicity'. This is not verifiable by tools, passing to synthesis if constraints are met.")

        else:
            goal_met = False
            state['conversation_history'].append(f"Router: Unknown goal '{goal}'. Passing to synthesis if constraints are met.")

    except Exception as e:
        state['conversation_history'].append(f"Router: Error during goal check: {e}. Retrying.")
        return "design"

    if not goal_met:
        state['conversation_history'].append(f"Router: Goal not met. {failure_message} Retrying.")
        return "design"

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