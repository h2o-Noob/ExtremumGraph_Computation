import numpy as np
import vtk
from vtk.util import numpy_support
import os

# --- input metadata from your NRRD file ---
filename = "/Users/h2o_arindam/Desktop/GV_Project/VolRnd/my-vtkjs-app/statue_leg_341x341x93_uint8.raw"
dims = (341, 341, 93)  # x, y, z from 'sizes'
dtype = np.uint8
spacing = (1.0, 1.0, 4.0)  # from 'space directions'

# --- read the raw data ---
data = np.fromfile(filename, dtype=dtype)
data = data.reshape((93, 341, 341))  # reshape as z, y, x for VTK

# --- convert numpy array to vtkImageData ---
vtk_data = numpy_support.numpy_to_vtk(
    num_array=data.ravel(order='F'),
    deep=True,
    array_type=vtk.VTK_UNSIGNED_CHAR
)

imageData = vtk.vtkImageData()
imageData.SetDimensions(341, 341, 93)
imageData.SetSpacing(spacing)
imageData.GetPointData().SetScalars(vtk_data)

# --- write to .vti in the public/data folder ---
output_path = "/Users/h2o_arindam/Desktop/GV_Project/VolRnd/my-vtkjs-app/public/data/statue_leg.vti"
os.makedirs(os.path.dirname(output_path), exist_ok=True)

writer = vtk.vtkXMLImageDataWriter()
writer.SetFileName(output_path)
writer.SetInputData(imageData)
writer.Write()

print("✅ Conversion complete: statue_leg.vti created at", output_path)
