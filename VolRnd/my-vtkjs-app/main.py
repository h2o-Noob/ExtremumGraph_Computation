import vtk
import os

# --- Configuration ---
INPUT_FILE = "/Users/h2o_arindam/Downloads/aneurism_256x256x256_uint8.vtp"
OUTPUT_FILE = "/Users/h2o_arindam/Downloads/aneurism_fixed.vti"
DIMENSIONS = (256, 256, 256) 

# --- Step 1: Handle the Extension Mismatch ---
# The file is named .vtp (PolyData) but contains UnstructuredGrid data.
# We must rename it strictly for the reader, or force the reader.
# The safest way for VTK is to temporarily rename the file extension.
temp_filename = INPUT_FILE.replace(".vtp", ".vtu")
if not os.path.exists(temp_filename):
    print(f"Renaming {INPUT_FILE} to {temp_filename} to satisfy VTK readers...")
    try:
        os.rename(INPUT_FILE, temp_filename)
        renamed = True
    except OSError:
        # If we can't rename (e.g. permission error), try reading anyway
        print("Warning: Could not rename file. Attempting to read directly...")
        temp_filename = INPUT_FILE
        renamed = False
else:
    renamed = False

# --- Step 2: Read the Data ---
print("Reading Unstructured Grid...")
reader = vtk.vtkXMLUnstructuredGridReader()
reader.SetFileName(temp_filename)
reader.Update()
data = reader.GetOutput()

bounds = data.GetBounds()
print(f"Data Loaded. Bounds: {bounds}")
print(f"Scalar Range: {data.GetScalarRange()}")

# --- Step 3: Resample to Image (Voxelize) ---
print(f"Resampling to {DIMENSIONS} volume...")
resample = vtk.vtkResampleToImage()
resample.SetInputData(data)  # <--- THIS CAUSED THE ERROR
resample.SetSamplingDimensions(DIMENSIONS)
resample.SetUseInputBounds(True)
resample.Update()

# --- Step 4: Save as VTI ---
print(f"Saving to {OUTPUT_FILE}...")
writer = vtk.vtkXMLImageDataWriter()
writer.SetFileName(OUTPUT_FILE)
writer.SetInputData(resample.GetOutput())
writer.Write()

# --- Cleanup ---
# Rename the file back if we changed it
if renamed:
    print(f"Restoring original filename...")
    os.rename(temp_filename, INPUT_FILE)

print("Conversion Complete.")