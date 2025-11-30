import numpy as np
import vtk
from vtk.util import numpy_support
import os

# --- Input metadata ---
filename = "/Users/h2o_arindam/Desktop/GV_Project/VolRnd/my-vtkjs-app/marschner_lobb_41x41x41_uint8.raw"
dims = (41, 41, 41)  # X, Y, Z
dtype = np.uint8
spacing = (1, 1, 1)
origin = (-20.5,-20.5,-20.5)

# --- Read the raw data ---
data = np.fromfile(filename, dtype=dtype)

# Verify file size
expected_size = np.prod(dims)
if data.size != expected_size:
    raise ValueError(f"Data size mismatch! Expected {expected_size}, got {data.size}")

# Reshape (VTK expects Z, Y, X order)
data = data.reshape((dims[2], dims[1], dims[0]))  # z, y, x

# --- Convert to VTK format ---
vtk_data = numpy_support.numpy_to_vtk(
    num_array=data.ravel(order='F'),  # Fortran order = z,y,x
    deep=True,
    array_type=vtk.VTK_UNSIGNED_SHORT
)

# --- Create vtkImageData ---
imageData = vtk.vtkImageData()
imageData.SetDimensions(dims)
imageData.SetSpacing(spacing)
imageData.SetOrigin(origin)
imageData.GetPointData().SetScalars(vtk_data)

# --- Write to .vti file ---
output_path = "/Users/h2o_arindam/Desktop/GV_Project/VolRnd/my-vtkjs-app/public/data/marschner_lobb.vti"
os.makedirs(os.path.dirname(output_path), exist_ok=True)

writer = vtk.vtkXMLImageDataWriter()
writer.SetFileName(output_path)
writer.SetInputData(imageData)
writer.Write()

print("Conversion complete:", output_path)
