// src/components/ui/World.jsx
import React, { useEffect, useRef } from "react";
import createGlobe from "cobe";

export function World({ data = [], globeConfig = {}, onReady }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;

    let phi = globeConfig.initialPhi ?? -0.6;
    let theta = globeConfig.initialTheta ?? 0.35;

    const defaultConfig = {
      devicePixelRatio: ratio,
      width: canvas.offsetWidth * 2,
      height: canvas.offsetWidth * 2,
      phi,
      theta,
      dark: 1,
      diffuse: 1.4,
      mapSamples: 30000,
      mapBrightness: 8,
      baseColor: [0.03, 0.03, 0.03],
      markerColor: [1, 0.45, 0.18],
      glowColor: [1, 1, 1],
      markers: data.map((d) => ({
        location: d.location || d.mapCoord || [0, 0],
        size: d.size ?? 0.03,
      })),
      onRender: (state) => {
        phi += (globeConfig.autoRotateSpeed ?? 0.0008);
        state.phi = phi;
        state.theta = theta;
      },
    };

    const config = { ...defaultConfig, ...(globeConfig || {}) };

    // IMPORTANT → pass canvas, not div
    const globe = createGlobe(canvas, config);

    const onResize = () => {
      globe.resize(canvas.offsetWidth * 2, canvas.offsetWidth * 2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      globe.destroy();
    };
  }, [canvasRef, JSON.stringify(data)]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ aspectRatio: 1 }}
      />
    </div>
  );
}
