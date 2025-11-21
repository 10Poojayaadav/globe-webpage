"use client";

import { useRef, useEffect } from "react";
import createGlobe from "cobe";

export function GlobeDemo({ points = [], onPointHover, onPointClick }) {
  const canvasRef = useRef(null);
  const globeRef = useRef(null);

  useEffect(() => {
    let phi = 0;
    let theta = 0;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 800 * 2,
      height: 800 * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [1, 1, 1],
      markerColor: [1, 0.5, 1],
      glowColor: [1, 1, 1],
      markers: points.map((p) => ({
        location: [p.lat, p.lng],
        size: 0.05,
      })),
      onRender: (state) => {
        state.phi = phi;
        state.theta = theta;
        phi += 0.001;
      },
    });

    globeRef.current = globe;

    return () => globe.destroy();
  }, [points]);

  return (
    <div className="relative flex justify-center items-center">
      <canvas
        ref={canvasRef}
        style={{
          width: "600px",
          height: "600px",
          cursor: "pointer",
        }}
      />
    </div>
  );
}
