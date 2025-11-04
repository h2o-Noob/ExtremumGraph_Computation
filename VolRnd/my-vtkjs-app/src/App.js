import { useEffect, useRef } from 'react';
import '@kitware/vtk.js/Rendering/Profiles/Volume';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkOpenGLRenderWindow from '@kitware/vtk.js/Rendering/OpenGL/RenderWindow';
import vtkRenderWindowInteractor from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';

function App() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create renderer and window
    const renderWindow = vtkRenderWindow.newInstance();
    const renderer = vtkRenderer.newInstance({ background: [0, 0, 0] });
    renderWindow.addRenderer(renderer);

    // Create OpenGL window
    const openGLRenderWindow = vtkOpenGLRenderWindow.newInstance();
    openGLRenderWindow.setContainer(containerRef.current);
    renderWindow.addView(openGLRenderWindow);

    // Setup interactor
    const interactor = vtkRenderWindowInteractor.newInstance();
    interactor.setView(openGLRenderWindow);
    interactor.initialize();
    interactor.bindEvents(containerRef.current);

    const style = vtkInteractorStyleTrackballCamera.newInstance();
    interactor.setInteractorStyle(style);

    // Volume setup
    const reader = vtkXMLImageDataReader.newInstance();
    const mapper = vtkVolumeMapper.newInstance();
    const actor = vtkVolume.newInstance();

    mapper.setSampleDistance(1.0);
    actor.setMapper(mapper);

    const ctfun = vtkColorTransferFunction.newInstance();
    const ofun = vtkPiecewiseFunction.newInstance();

    ctfun.addRGBPoint(0, 0, 0, 0);
    ctfun.addRGBPoint(255, 1, 1, 1);
    ofun.addPoint(0, 0);
    ofun.addPoint(255, 1);

    actor.getProperty().setRGBTransferFunction(0, ctfun);
    actor.getProperty().setScalarOpacity(0, ofun);
    actor.getProperty().setInterpolationTypeToLinear();

    renderer.addVolume(actor);

    // Load data
    reader.setUrl(`/data/mri_ventricles.vti`, { loadData: true }).then(() => {
      const imageData = reader.getOutputData();
      mapper.setInputData(imageData);
      renderer.resetCamera();
      renderWindow.render();
    });

    // Cleanup
    return () => {
      renderWindow.delete();
      renderer.delete();
      openGLRenderWindow.delete();
      interactor.delete();
      reader.delete();
      mapper.delete();
      actor.delete();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'black',
      }}
    />
  );
}

export default App;
