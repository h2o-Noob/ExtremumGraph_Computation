// src/App.jsx
import React, { useState } from 'react';
import VolumeView from './components/VolumeView';
import SpineView from './components/SpineView';
import graphData from '../public/data/graph.json'; // Or fetch() it

export default function App() {
  // This state is the "bridge"
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);

  return (
    <div className="layout">
      
      {/* 2D Spine View */}
      <div className="left-panel">
        <SpineView 
          data={graphData} 
          onSelect={(id) => setSelectedFeatureId(id)} 
        />
      </div>

      {/* 3D Volume View */}
      <div className="right-panel">
        <VolumeView 
          file="/data/head.vti" 
          highlightId={selectedFeatureId} // Pass the ID down to VTK
        />
      </div>
      
    </div>
  );
}