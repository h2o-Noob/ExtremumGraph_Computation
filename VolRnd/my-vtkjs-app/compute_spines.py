import vtk
from paraview.simple import *
import paraview.servermanager as sm
import json
import os
import sys

# --- STEP 1: LOAD TTK PLUGIN ---
print("Attempting to load TTK Plugin...")

# Update this path if needed (based on your logs, this one is correct)
ttk_plugin_path = "/Applications/ParaView-6.0.1.app/Contents/Plugins/TopologyToolKit/TopologyToolKit.so"

if os.path.exists(ttk_plugin_path):
    print(f"Loading TTK from: {ttk_plugin_path}")
    LoadPlugin(ttk_plugin_path, remote=False, ns=globals())
else:
    print(f"CRITICAL ERROR: File not found at {ttk_plugin_path}")
    sys.exit(1)

# --- STEP 2: HELPER FUNCTIONS ---

def find_node_id_by_coords(target_coords, nodes_list, tolerance=1e-5):
    for node in nodes_list:
        dx = node['x'] - target_coords[0]
        dy = node['y'] - target_coords[1]
        dz = node['z'] - target_coords[2]
        if (dx*dx + dy*dy + dz*dz) < tolerance:
            return node['id']
    return -1

def compute_extremum_graph(input_vti_path, output_json_path):
    print(f"Loading data from {input_vti_path}...")
    
    if not os.path.exists(input_vti_path):
        print(f"Error: Input file not found: {input_vti_path}")
        return

    reader = XMLImageDataReader(FileName=input_vti_path)
    
    # --- STEP 3: DYNAMICALLY FIND THE FILTER ---
    print("Searching for TTK FTM Tree filter...")
    
    ftm = None
    
    # Try 1: Direct Global Access (Standard)
    if 'TTKFTMTree' in globals():
        print("Found 'TTKFTMTree' in globals.")
        ftm = TTKFTMTree(Input=reader)
    # Try 2: ServerManager Sources (The internal registry)
    elif hasattr(sm.sources, 'TTKFTMTree'):
        print("Found 'TTKFTMTree' in servermanager.")
        ftm = sm.sources.TTKFTMTree(Input=reader)
    # Try 3: Alternative Name (Sometimes it's just 'FTMTree')
    elif hasattr(sm.sources, 'FTMTree'):
        print("Found 'FTMTree' (alternative name).")
        ftm = sm.sources.FTMTree(Input=reader)
    
    if ftm is None:
        print("\nERROR: Could not find the FTM Tree filter.")
        print("Available TTK filters:")
        # Debugging: List what actually loaded
        for name in dir(sm.sources):
            if "TTK" in name or "FTM" in name:
                print(f" - {name}")
        return

    # Configure the filter
    # Note: Use camelCase for properties if capitalized fails (older versions)
    try:
        ftm.TreeType = 'Join Tree'
        ftm.WithSegmentation = 1
    except:
        print("Warning: Could not set properties standard way. Trying fallback...")
        ftm.TreeType = 0 # 0 often maps to Join Tree
        ftm.WithSegmentation = 1
    
    print("Computing Topology (this may take a moment)...")
    UpdatePipeline()
    
    # --- STEP 4: FETCH DATA ---
    print("Fetching graph data...")
    vtk_nodes = servermanager.Fetch(ftm, 0) 
    vtk_arcs = servermanager.Fetch(ftm, 1)

    output_data = {"nodes": [], "links": []}
    
    # --- NODES ---
    num_points = vtk_nodes.GetNumberOfPoints()
    scalars = vtk_nodes.GetPointData().GetScalars() 
    
    # Robust property checking
    types = None
    pd = vtk_nodes.GetPointData()
    if pd.HasArray("CriticalType"):
        types = pd.GetArray("CriticalType")
    elif pd.HasArray("Critical Type"):
        types = pd.GetArray("Critical Type")
    elif pd.HasArray("Node Type"):
        types = pd.GetArray("Node Type")

    print(f"Processing {num_points} nodes...")
    
    for i in range(num_points):
        coords = vtk_nodes.GetPoint(i)
        val = scalars.GetValue(i) if scalars else 0
        ctype = types.GetValue(i) if types else 0
        
        output_data["nodes"].append({
            "id": i,
            "type": int(ctype), 
            "scalar": val,
            "x": coords[0], "y": coords[1], "z": coords[2]
        })

    # --- ARCS ---
    num_cells = vtk_arcs.GetNumberOfCells()
    print(f"Processing {num_cells} edges...")

    for i in range(num_cells):
        cell = vtk_arcs.GetCell(i)
        pts = cell.GetPoints()
        if pts.GetNumberOfPoints() < 2:
            continue
            
        p_start = pts.GetPoint(0)
        p_end = pts.GetPoint(pts.GetNumberOfPoints() - 1)
        
        source_id = find_node_id_by_coords(p_start, output_data["nodes"])
        target_id = find_node_id_by_coords(p_end, output_data["nodes"])
        
        if source_id != -1 and target_id != -1 and source_id != target_id:
            output_data["links"].append({
                "source": source_id,
                "target": target_id
            })

    with open(output_json_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"Success! Graph exported to {output_json_path}")

# Run it
compute_extremum_graph(
    "/Users/h2o_arindam/Desktop/GV_Project/VolRnd/my-vtkjs-app/public/data/marschner_lobb.vti", 
    "tachyview_graph.json"
)