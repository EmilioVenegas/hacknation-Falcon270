import os
import json
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from crewai import Agent, Task, Crew
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from tools import static_tools, get_is_smiles_string_valid, get_logp, get_similarity, get_molecular_weight, get_tpsa, get_aromatic_rings

# --- Load API Key ---
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in .env file. Please create a .env file and add it.")

# --- Define Model ---
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=GOOGLE_API_KEY
)

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
    into a structured JSON report. If a successful molecule was found, set status to 'Success'.
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
    crew = Crew(agents=[designer_agent], tasks=[task], verbose=False)
    
    new_smiles = crew.kickoff()
    
    state['proposed_smiles'] = new_smiles.strip().replace("`", "").replace("python", "")
    state['retries'] += 1
    state['conversation_history'].append(f"Designer (Attempt {state['retries']}): Proposed {state['proposed_smiles']}")
    
    return state

def validator_node(state: ResearchState) -> ResearchState:
    smiles = state['proposed_smiles']
    original_smiles = state['input_smiles']
    
    # Use the validator agent to get a natural language summary
    prompt = f"""
    Validate the proposed SMILES string: {smiles}
    Original SMILES for comparison: {original_smiles}
    
    You MUST use your tools to find:
    1.  Is the proposed SMILES valid? (use get_is_smiles_string_valid)
    2.  What is its LogP? (use get_logp)
    3.  What is its similarity to the original? (use get_similarity)
    4.  What is its Molecular Weight? (use get_molecular_weight)
    5.  What is its TPSA? (use get_tpsa)
    6.  How many aromatic rings? (use get_aromatic_rings)
    
    After getting all data, write a one-paragraph summary.
    """
    
    task = Task(description=prompt, agent=validator_agent, expected_output="A one-paragraph summary of all validation data.")
    crew = Crew(agents=[validator_agent], tasks=[task], verbose=False)
    
    validation_summary = crew.kickoff()
    
    # Manually call tools to get structured data for the router
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
            "summary": validation_summary
        }
        
    state['validation_results'] = results
    state['conversation_history'].append(f"Validator: {validation_summary}")
    return state

def synthesizer_node(state: ResearchState) -> ResearchState:
    # This node formats the final report based on the final state
    status = "Failure"
    if state['validation_results'].get("is_valid", False) and state['validation_results'].get("meets_constraints", False):
        status = "Success"
        
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
    if state['retries'] >= state['max_retries']:
        state['validation_results']['summary'] = "Failure: Max retries reached."
        state['validation_results']['meets_constraints'] = False
        return "synthesize"
    
    results = state['validation_results']
    constraints = state['constraints']
    
    if not results.get("is_valid", False):
        state['conversation_history'].append("Router: Invalid SMILES. Retrying.")
        return "design"

    min_similarity = constraints.get("similarity", 0.0)
    if results.get("similarity", 1.0) < min_similarity:
        state['conversation_history'].append(f"Router: Similarity {results['similarity']} is below threshold {min_similarity}. Retrying.")
        return "design"

    # Simplified goal check
    # In a real app, this would use an LLM call or complex parser
    if "Decrease LogP" in state['optimization_goal']:
        original_logp = float(get_logp.run(state['input_smiles']))
        if results.get("logp", 100) >= original_logp:
            state['conversation_history'].append(f"Router: New LogP {results['logp']} is not better than original {original_logp}. Retrying.")
            return "design"
    
    if "Increase LogP" in state['optimization_goal']:
        original_logp = float(get_logp.run(state['input_smiles']))
        if results.get("logp", -100) <= original_logp:
            state['conversation_history'].append(f"Router: New LogP {results['logp']} is not better than original {original_logp}. Retrying.")
            return "design"

    # If all checks pass
    state['validation_results']['meets_constraints'] = True
    state['conversation_history'].append("Router: All constraints met. Proceeding to final synthesis.")
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