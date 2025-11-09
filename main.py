import json
import uvicorn
import io
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
from graph import compiled_graph, ResearchState
from tools import (
    visualize_molecule_to_png, get_is_smiles_string_valid, get_sa_score
)

# --- FastAPI App Setup ---
app = FastAPI(
    title="Agentic Medicinal Chemist (AMC) Server",
    description="API for the AMC Hackathon Project"
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for hackathon)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class CrewRequest(BaseModel):
    smiles: str
    goal: str
    constraints: Dict[str, Any]

# --- API Endpoints ---

@app.get("/api/visualize")
async def get_visualize(smiles: str = Query(..., description="The SMILES string to visualize")):
    """
    Generates a PNG image of a molecule from a SMILES string.
    """
    try:
        png_bytes = visualize_molecule_to_png(smiles)
        return StreamingResponse(io.BytesIO(png_bytes), media_type="image/png")
    except Exception as e:
        return StreamingResponse(
            io.BytesIO(visualize_molecule_to_png("")), 
            media_type="image/png", 
            status_code=400
        )

@app.get("/api/get-sa-score")
async def get_sa_score_endpoint(smiles: str = Query(..., description="The SMILES string to score")):
    """
    Calculates the Synthesizability (SA) Score for a given SMILES string.
    """
    try:
        is_valid = get_is_smiles_string_valid.run(smiles)
        if is_valid != "Valid":
            return JSONResponse(content={"valid": False, "sa_score": None, "error": "Invalid SMILES"}, status_code=400)
        
        sa_score_str = get_sa_score.run(smiles)
        sa_score = float(sa_score_str)
        return JSONResponse(content={"valid": True, "sa_score": sa_score})
        
    except Exception as e:
        return JSONResponse(content={"valid": False, "sa_score": None, "error": str(e)}, status_code=500)

@app.post("/api/run-crew")
async def run_crew(request: CrewRequest):
    """
    Runs the agentic crew and streams the results as Server-Sent Events (SSE).
    """
    
    constraints = request.constraints
    # Set default (unconstrained) values if toggles are off
    if not constraints.get("isMwEnabled", False):
        constraints["mwMin"] = 0
        constraints["mwMax"] = 9999
    if not constraints.get("isSaScoreEnabled", False):
        constraints["saScore"] = 10.0 # 10 is max, so default is no constraint
    
    initial_state = ResearchState(
        input_smiles=request.smiles,
        optimization_goal=request.goal,
        constraints=constraints, # Pass the modified constraints
        proposed_smiles="",
        validation_results={},
        conversation_history=[],
        final_report={},
        retries=0,
        max_retries=5,  # Hardcode max 5 attempts for the demo
        imilarity_failures=0,
        max_similarity_failures=4
    )

    async def event_stream():
        """The async generator for streaming SSE."""
        last_history_index = 0
        try:
            # astream() returns an async iterator of state snapshots
            async for event in compiled_graph.astream(initial_state):
                
                # 'event' is a dictionary where keys are node names
                # We'll just grab the last node that ran
                last_node = list(event.keys())[-1]
                
                if last_node == "__end__":
                    # Safeguard in case the report wasn't caught
                    final_report = event[last_node].get("final_report")
                    if final_report:
                        sse_data = {"type": "final_report", "data": final_report}
                        yield f"data: {json.dumps(sse_data)}\n\n"
                    break

                current_state = event[last_node]
                # Check for new messages in conversation_history
                history = current_state.get("conversation_history", [])
                new_messages_count = len(history) - last_history_index
                
                if new_messages_count > 0:
                    for i in range(last_history_index, len(history)):
                        sse_data = {
                            "type": "agent_thought",
                            "message": history[i],
                            # Always include the current proposed SMILES.
                            # The frontend will decide if it should be shown.
                            "proposed_smiles": current_state.get("proposed_smiles", ""),
                        }
                        
                        # --- REMOVED redundant 'design' and 'synthesize' blocks ---

                        # Keep existing logic to attach validation data
                        if last_node == "validate" and i == len(history) - 1:
                            sse_data["validation_data"] = current_state.get("validation_results")

                        yield f"data: {json.dumps(sse_data)}\n\n"
                    last_history_index = len(history)

                # Check for the final report AFTER sending messages
                final_report = current_state.get("final_report")
                if final_report:
                    # If we have a final report, send it and we are done.
                    sse_data = {"type": "final_report", "data": final_report}
                    yield f"data: {json.dumps(sse_data)}\n\n"
                    break # Stop the stream
        except Exception as e:
            print(f"Error in stream: {e}")
            sse_data = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(sse_data)}\n\n"
        
        finally:
            # Send a final message to signal the client to close
            sse_data = {"type": "stream_end"}
            yield f"data: {json.dumps(sse_data)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

# --- Run Server ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)