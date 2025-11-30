import { useEffect, useRef, useState, useCallback } from 'react';
import '@kitware/vtk.js/Rendering/Profiles/Volume';

// Standard VTK imports
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
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkBoundingBox from '@kitware/vtk.js/Common/DataModel/BoundingBox';

// Controller
import vtkVolumeController from '@kitware/vtk.js/Interaction/UI/VolumeController';

function VolumeView() {
  const vtkContainerRef = useRef(null);
  const widgetContainerRef = useRef(null);
  const context = useRef(null);
  
  const [status, setStatus] = useState('Initializing...');

  // --- REUSABLE DATA LOADER ---
  const loadArrayBuffer = useCallback((arrayBuffer) => {
    if (!context.current) return;
    const { reader, mapper, actor, renderer, renderWindow, controller } = context.current;

    try {
      setStatus('Parsing data...');
      reader.parseAsArrayBuffer(arrayBuffer);
      const imageData = reader.getOutputData();
      
      if (!imageData) {
        setStatus('Error: Could not parse VTI file');
        return;
      }

      // High Fidelity Logic
      const bounds = imageData.getBounds();
      const dimensions = imageData.getDimensions();
      const diagonal = vtkBoundingBox.getDiagonalLength(bounds);
      const maxDim = Math.max(...dimensions);
      const avgSpacing = diagonal / maxDim;

      mapper.setSampleDistance(avgSpacing / 4); 
      actor.getProperty().setScalarOpacityUnitDistance(0, avgSpacing * 15.0);
      mapper.setAutoAdjustSampleDistances(false); 
      
      mapper.setInputData(imageData);
      renderer.addVolume(actor);
      renderer.resetCamera();
      renderer.getActiveCamera().zoom(1.5);

      // Update Controller UI
      controller.setupContent(renderWindow, actor, false);
      controller.render();

      renderWindow.render();
      setStatus(`Loaded: ${dimensions.join('x')}`);

    } catch (e) {
      console.error(e);
      setStatus('Error loading file');
    }
  }, []);

  // --- INITIAL SETUP ---
  useEffect(() => {
    if (!vtkContainerRef.current) return;
    let isMounted = true;

    // Clear containers
    vtkContainerRef.current.innerHTML = '';
    if (widgetContainerRef.current) widgetContainerRef.current.innerHTML = '';

    setStatus('Setting up VTK...');

    // 1. VTK Environment
    const renderWindow = vtkRenderWindow.newInstance();
    const renderer = vtkRenderer.newInstance({ background: [0, 0, 0] });
    renderWindow.addRenderer(renderer);

    const openGLRenderWindow = vtkOpenGLRenderWindow.newInstance();
    openGLRenderWindow.setContainer(vtkContainerRef.current);
    const { width, height } = vtkContainerRef.current.getBoundingClientRect();
    openGLRenderWindow.setSize(width, height);
    renderWindow.addView(openGLRenderWindow);

    const interactor = vtkRenderWindowInteractor.newInstance();
    interactor.setView(openGLRenderWindow);
    interactor.initialize();
    interactor.bindEvents(vtkContainerRef.current);
    interactor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());

    // 2. Pipeline
    const reader = vtkXMLImageDataReader.newInstance();
    const mapper = vtkVolumeMapper.newInstance();
    const actor = vtkVolume.newInstance();
    actor.setMapper(mapper);

    const ctfun = vtkColorTransferFunction.newInstance();
    const ofun = vtkPiecewiseFunction.newInstance();
    ctfun.applyColorMap(vtkColorMaps.getPresetByName('Cool to Warm'));
    actor.getProperty().setRGBTransferFunction(0, ctfun);
    actor.getProperty().setScalarOpacity(0, ofun);
    actor.getProperty().setInterpolationTypeToLinear();

    // 3. Controller
    const controller = vtkVolumeController.newInstance({
      size: [400, 150], 
      rescaleColorMap: true, 
      expanded: true 
    });
    controller.setContainer(widgetContainerRef.current);

    context.current = {
      renderWindow, renderer, openGLRenderWindow, interactor,
      reader, mapper, actor, controller, ctfun, ofun
    };

    // 4. Fetch Default Data
    const defaultURL = '/data/head-binary.vti';
    setStatus(`Fetching default data...`);
    
    fetch(defaultURL)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        if(isMounted) loadArrayBuffer(buffer);
      })
      .catch(err => console.error("Default load failed", err));

    // 5. Resize Logic
    const handleResize = () => {
      if (vtkContainerRef.current) {
        const { width, height } = vtkContainerRef.current.getBoundingClientRect();
        openGLRenderWindow.setSize(width, height);
        renderWindow.render();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      controller.delete(); 
      renderWindow.removeRenderer(renderer);
      renderWindow.delete();
      renderer.delete();
      openGLRenderWindow.delete();
      interactor.delete();
      reader.delete();
      mapper.delete();
      actor.delete();
      ctfun.delete();
      ofun.delete();
    };
  }, [loadArrayBuffer]);

  // Handler: Local File Upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setStatus(`Reading ${file.name}...`);
    const fileReader = new FileReader();
    fileReader.onload = (e) => loadArrayBuffer(fileReader.result);
    fileReader.readAsArrayBuffer(file);
  };

  const colors = {
    bgLight: '#f0f0f0',
    bgMedium: '#e0e0e0',
    border: '#cccccc',
    textDark: '#333333',
    textLight: '#555555'
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif', backgroundColor: colors.bgLight }}>
      
      <style>{`
        /* Target the generated vtk.js element */
        .VolumeController-module_container__2HNSO  {
          margin-top: 120px !important;
        }
      `}</style>
      
      {/* --- LEFT SIDEBAR --- */}
      <div style={{ 
        width: '420px',
        height: '100%',
        backgroundColor: colors.bgLight,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        zIndex: 2
      }}>
        
        {/* 1. Header (Top) */}
        <div style={{ 
          flex: '0 0 auto', 
          padding: '20px', 
          borderBottom: `1px solid ${colors.border}`, 
          backgroundColor: colors.bgMedium ,
        }}>
          <h2 style={{ margin: 0, color: colors.textDark, fontSize: '20px' }}>Volume Viewer</h2>
          <p style={{ margin: '5px 0 15px 0', fontSize: '12px', color: colors.textLight }}>
            Status: {status}
          </p>

          <label style={{
            display: 'inline-block',
            backgroundColor: '#007bff',
            color: 'white',
            padding: '8px 15px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            📂 Open VTI File
            <input 
              type="file" 
              accept=".vti" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>

        {/* 2. Instructions (Moved Up) */}
        <div style={{ 
          flex: '0 0 auto', 
          padding: '20px', 
          borderBottom: `1px solid ${colors.border}`,
          marginTop: '180px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: colors.textDark, fontSize: '14px' }}>Controls</h4>
          <ul style={{ fontSize: '13px', paddingLeft: '20px', margin: 0, color: colors.textLight, lineHeight: '1.6' }}>
            <li><strong>Rotate:</strong> Left Click + Drag</li>
            <li><strong>Zoom:</strong> Right Click + Drag</li>
            <li><strong>Pan:</strong> Shift + Drag</li>
            <li style={{marginTop: '5px'}}><strong>Widget:</strong></li>
            <li>Double-click to add point</li>
            <li>Right-click to delete point</li>
          </ul>
        </div>

        {/* 3. Spacer ( pushes widget to bottom ) */}
        <div style={{ flex: 1 }}></div>

        {/* 4. Widget Section (Bottom Left Corner) */}
        <div style={{ 
          flex: '0 0 auto', 
          padding: '10px 20px 20px 20px', // Add padding at bottom
          backgroundColor: '#fafafa',
          borderTop: `1px solid ${colors.border}`
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: colors.textDark, fontSize: '14px' }}>Opacity & Color</h4>
          {/* Explicit height ensures the controller fits perfectly */}
          <div ref={widgetContainerRef} style={{ height: '160px', width: '100%', marginTop: '3000px'}} />
        </div>

      </div>

      {/* --- RIGHT PANE --- */}
      <div style={{ flex: 1, position: 'relative', height: '100%', backgroundColor: 'black' }}>
        <div 
          ref={vtkContainerRef} 
          style={{ width: '100%', height: '100%' }} 
        />
      </div>

    </div>
  );
}

export default VolumeView;