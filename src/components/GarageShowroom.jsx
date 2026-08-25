import { useState } from 'react';
import F1CarViewer from './F1CarViewer.jsx';

export default function GarageShowroom() {
  const [aeroMode, setAeroMode] = useState('Z-MODE');
  const [windTunnel, setWindTunnel] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [cameraPreset, setCameraPreset] = useState('iso');

  const handleCameraPreset = (preset) => {
    setCameraPreset(preset);
    setAutoRotate(false);
  };

  return (
    <div className="garage-page">
      {/* 1. Header Bar & 2026 FIA Technical Regulations */}
      <div className="garage-header">
        <div className="garage-title-col">
          <div className="garage-badge-row">
            <span className="garage-badge fia-red">FIA 2026 PROTO</span>
            <span className="garage-badge tech-active">ACTIVE AERO // 3D LAB</span>
          </div>
          <h2 className="garage-title">2026 REGULATION PROTOTYPE</h2>
          <p className="garage-subtitle">
            Next-generation active aerodynamics, 50% electrical power unit packaging, and agile chassis architecture.
          </p>
        </div>

        {/* Top Telemetry Spec Capsules */}
        <div className="garage-specs-ribbon">
          <div className="spec-capsule">
            <span className="spec-k">WHEELBASE</span>
            <span className="spec-v">3,400 mm <span className="spec-delta">-200mm</span></span>
          </div>
          <div className="spec-capsule">
            <span className="spec-k">CHASSIS WIDTH</span>
            <span className="spec-v">1,900 mm <span className="spec-delta">-100mm</span></span>
          </div>
          <div className="spec-capsule">
            <span className="spec-k">MIN WEIGHT</span>
            <span className="spec-v">768 kg <span className="spec-delta">-30kg</span></span>
          </div>
          <div className="spec-capsule">
            <span className="spec-k">MGU-K OUTPUT</span>
            <span className="spec-v highlight-red">350 kW <span className="spec-delta">+230kW</span></span>
          </div>
        </div>
      </div>

      {/* 2. Main 3D Stage + Control Dock */}
      <div className="garage-stage-container">
        {/* 3D Canvas */}
        <F1CarViewer
          aeroMode={aeroMode}
          windTunnel={windTunnel}
          autoRotate={autoRotate}
          cameraPreset={cameraPreset}
        />

        {/* Top-Right HUD Overlay: Active Aero Telemetry Status */}
        <div className="garage-hud-overlay">
          <div className="hud-metric-card">
            <div className="hud-metric-header">
              <span className="hud-dot" />
              <span className="hud-title">AERO STATE</span>
            </div>
            <div className="hud-metric-val">
              {aeroMode === 'Z-MODE' ? (
                <span className="val-z-mode">Z-MODE // HIGH DOWNFORCE</span>
              ) : (
                <span className="val-x-mode">X-MODE // LOW DRAG OVERTAKE</span>
              )}
            </div>
            <div className="hud-metric-sub">
              {aeroMode === 'Z-MODE'
                ? 'Front & Rear Flaps: +14.2° Angle of Attack'
                : 'Front & Rear Flaps: Neutral 0.0° Streamline'}
            </div>
          </div>
        </div>

        {/* Interactive Bottom Control Center Dock */}
        <div className="garage-control-dock">
          {/* Aero Mode Toggle (Z-Mode vs X-Mode) */}
          <div className="dock-group aero-mode-group">
            <button
              type="button"
              className={`dock-btn mode-btn ${aeroMode === 'Z-MODE' ? 'is-active z-mode' : ''}`}
              onClick={() => setAeroMode('Z-MODE')}
              title="Cornering High Downforce Mode"
            >
              <span className="btn-icon">⚡</span>
              <span className="btn-txt">Z-MODE (CORNERING)</span>
            </button>
            <button
              type="button"
              className={`dock-btn mode-btn ${aeroMode === 'X-MODE' ? 'is-active x-mode' : ''}`}
              onClick={() => setAeroMode('X-MODE')}
              title="Straight-Line Low Drag Mode"
            >
              <span className="btn-icon">🚀</span>
              <span className="btn-txt">X-MODE (STRAIGHTS)</span>
            </button>
          </div>

          <div className="dock-divider" />

          {/* Wind Tunnel Streamlines Toggle */}
          <button
            type="button"
            className={`dock-btn toggle-btn ${windTunnel ? 'is-active' : ''}`}
            onClick={() => setWindTunnel((prev) => !prev)}
            title="Toggle Particle Streamlines"
          >
            <span className="btn-icon">💨</span>
            <span className="btn-txt">{windTunnel ? 'WIND TUNNEL [ON]' : 'WIND TUNNEL [OFF]'}</span>
          </button>

          {/* Auto Rotate Toggle */}
          <button
            type="button"
            className={`dock-btn toggle-btn ${autoRotate ? 'is-active' : ''}`}
            onClick={() => setAutoRotate((prev) => !prev)}
            title="Auto-Rotate Turntable"
          >
            <span className="btn-icon">⟳</span>
            <span className="btn-txt">{autoRotate ? 'ROTATE [ON]' : 'ROTATE [OFF]'}</span>
          </button>

          <div className="dock-divider" />

          {/* Camera Angle Presets */}
          <div className="dock-group camera-presets-group">
            {['iso', 'front', 'side', 'top', 'rear', 'cockpit'].map((preset) => (
              <button
                key={preset}
                type="button"
                className={`camera-preset-btn ${cameraPreset === preset ? 'is-active' : ''}`}
                onClick={() => handleCameraPreset(preset)}
              >
                {preset.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
