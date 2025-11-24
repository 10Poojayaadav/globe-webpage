// src/components/GlobePage.jsx
import React, { useRef, useState } from "react";
import { World } from "./ui/World";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Uses the uploaded video as placeholder asset:
 * /mnt/data/VID_20251121_130742.mp4
 */
const MEDIA_PLACEHOLDER = "/mnt/data/VID_20251121_130742.mp4";

/* Example pins - lat, lng, label, optional subtitle/headshot */
const PINS = [
  { id: 1, label: "New Delhi", lat: 28.6139, lng: 77.2090, subtitle: "India", media: MEDIA_PLACEHOLDER },
  { id: 2, label: "London", lat: 51.5072, lng: -0.1276, subtitle: "UK", media: MEDIA_PLACEHOLDER },
  { id: 3, label: "New York", lat: 40.7128, lng: -74.0060, subtitle: "USA", media: MEDIA_PLACEHOLDER },
];

export default function GlobeWithPins() {
  // references and state for projection/pin popups
  const wrapperRef = useRef(null);
  const globeStateRef = useRef(null); // filled by World onReady
  const [activePin, setActivePin] = useState(null);

  const globeConfig = {
    autoRotate: true,
    autoRotateSpeed: 0.0012,
    mapSamples: 28000,
    mapBrightness: 8,
    initialPhi: -0.6,
    initialTheta: 0.35,
    // extra cinematic tuning
    baseColor: [0.02, 0.02, 0.02],
    markerColor: [1, 0.4, 0.15],
    glowColor: [1, 1, 1],
  };

  // called by World when globe is rendering - gives us access to current phi/theta
  function handleWorldReady(ref) {
    globeStateRef.current = ref;
  }

  // Project lat/lng to screen coords relative to the globe root element
  function latLngToScreen(lat, lng) {
    if (!globeStateRef.current || !wrapperRef.current) {
      return { x: -9999, y: -9999, visible: false };
    }
    const { phi } = globeStateRef.current;
    const R = wrapperRef.current.offsetWidth / 2; // since World renders a square matching wrapper width
    // spherical math
    const lambda = (lng * Math.PI) / 180;
    const phiLat = (lat * Math.PI) / 180;
    const x = Math.cos(phiLat) * Math.cos(lambda);
    const y = Math.sin(phiLat);
    const z = Math.cos(phiLat) * Math.sin(lambda);
    const rot = phi;
    const xr = x * Math.cos(rot) + z * Math.sin(rot);
    const zr = -x * Math.sin(rot) + z * Math.cos(rot);
    const scale = R * 0.95;
    const sx = wrapperRef.current.offsetLeft + R + xr * scale - wrapperRef.current.getBoundingClientRect().left;
    const sy = wrapperRef.current.getBoundingClientRect().top + R - y * scale - window.scrollY;
    const visible = zr > 0.02;
    // convert to wrapper-local coordinates (left/top relative to wrapper)
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const localX = sx - wrapperRect.left;
    const localY = sy - wrapperRect.top;
    return { x: localX, y: localY, visible };
  }

  // when user clicks a pin we center globe by setting target phi on world via internal ref
  function focusOnPin(pin) {
    // compute target phi (simple mapping: -lon)
    const targetPhi = -((pin.lng * Math.PI) / 180);
    // set globeStateRef.current.targetPhi so World will interpolate toward it
    if (globeStateRef.current) globeStateRef.current.targetPhi = targetPhi;
    setActivePin(pin);
  }

  // popup animation
  const popupVariants = {
    enter: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 6, scale: 0.98 },
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HERO */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Slight background gradient like the demo */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#020617] to-black opacity-95" />

        <div className="relative z-20 w-full max-w-[1200px] px-6">
          <div className="mx-auto flex flex-col items-center">
            <div className="mb-8 text-center z-30">
              <h1 className="text-3xl md:text-5xl font-extrabold">We sell soap worldwide</h1>
              <p className="text-neutral-400 mt-3 max-w-xl mx-auto">Interactive cinematic globe. Click pins to open player/place cards.</p>
            </div>

            {/* Globe wrapper - square container where World will render a square canvas */}
            <div ref={wrapperRef} className="relative w-[680px] h-[680px] rounded-2xl overflow-hidden" style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
              {/* World renders inside here */}
              <div className="absolute inset-0">
                <World
                  data={PINS.map((p) => ({ location: [p.lat, p.lng] }))}
                  globeConfig={globeConfig}
                  onReady={handleWorldReady}
                />
              </div>

              {/* Pin overlays */}
              {PINS.map((p) => {
                const pos = latLngToScreen(p.lat, p.lng);
                // When globe moves, these positions will update on rerender (make sure wrapper size is stable)
                const visible = pos.visible && pos.x >= 0 && pos.x <= wrapperRef.current?.offsetWidth && pos.y >= 0 && pos.y <= wrapperRef.current?.offsetHeight;
                return (
                  <div key={p.id} style={{ position: "absolute", left: pos.x ?? -9999, top: pos.y ?? -9999, transform: "translate(-50%,-50%)", pointerEvents: visible ? "auto" : "none", opacity: visible ? 1 : 0.16 }}>
                    <button
                      onClick={() => focusOnPin({ id: p.id, label: p.label, lat: p.lat, lng: p.lng, subtitle: p.subtitle, media: p.media })}
                      className="relative w-9 h-9 rounded-full flex items-center justify-center"
                      aria-label={p.label}
                    >
                      <span className="absolute w-10 h-10 rounded-full" style={{ background: "rgba(255,120,60,0.06)", filter: "blur(8px)", animation: "pulse 1.6s infinite ease-out" }} />
                      <span className="absolute w-5 h-5 rounded-full" style={{ boxShadow: "0 0 14px rgba(255,102,51,0.9)", background: "rgba(255,102,51,0.95)" }} />
                      <span style={{ width: 8, height: 8, borderRadius: 8, background: "rgb(255,102,51)", position: "relative", zIndex: 10 }} />
                    </button>
                  </div>
                );
              })}

              {/* Popup card anchored to activePin */}
              <AnimatePresence>
                {activePin && (() => {
                  const pos = latLngToScreen(activePin.lat, activePin.lng);
                  const left = Math.max(48, Math.min((wrapperRef.current?.offsetWidth ?? 680) - 48, pos.x ?? (wrapperRef.current?.offsetWidth ?? 680) / 2));
                  const top = (pos.y ?? 100) - 110; // place above the pin
                  const visible = pos.visible && top > 0;
                  // fallback center top if not visible
                  const cardLeft = visible ? left : (wrapperRef.current?.offsetWidth ?? 680) / 2;
                  const cardTop = visible ? Math.max(24, top) : 28;
                  return (
                    <motion.div
                      key={activePin.id}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.25 }}
                      style={{ position: "absolute", left: cardLeft, top: cardTop, transform: "translate(-50%,0)", width: 220, zIndex: 60 }}
                      className="rounded-xl p-3 bg-black/65 backdrop-blur border border-white/10 shadow-lg"
                      onClick={() => setActivePin(null)}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-900 flex-shrink-0 border border-white/6">
                          {/* using uploaded video path as placeholder media – browsers may not show poster but it preserves your asset */}
                          <video src={activePin.media} muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{activePin.label}</div>
                          <div className="text-xs text-gray-300">{activePin.subtitle}</div>
                          <div className="mt-2 text-xs text-gray-400">Placeholder description — replace with real content.</div>
                        </div>
                      </div>
                      <div className="mt-3 text-right">
                        <button className="text-xs px-3 py-1 rounded bg-white/8 hover:bg-white/12">Close</button>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              <style>{`
                @keyframes pulse {
                  0% { transform: scale(0.95); opacity: 0.9; }
                  70% { transform: scale(1.35); opacity: 0; }
                  100% { transform: scale(1.6); opacity: 0; }
                }
              `}</style>
            </div>

            {/* caption under globe */}
            <div className="mt-8 text-center max-w-2xl">
              <h2 className="text-2xl font-extrabold">Global Presence</h2>
              <p className="text-gray-400 mt-2">Click on pins to reveal popups. This matches the assignment behaviour and layout.</p>
            </div>
          </div>
        </div>

        {/* subtle downward arrow */}
        <a href="#ecosystem" className="absolute bottom-8 z-30">
          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </a>
      </section>

      {/* Ecosystem section below */}
      <section id="ecosystem" className="min-h-screen flex items-center justify-center px-6 pb-20">
        <div className="max-w-6xl w-full mx-auto grid grid-cols-12 gap-6 items-center">
          <div className="col-span-12 lg:col-span-6">
            <div className="text-sm text-orange-400 font-medium mb-4">ECOSYSTEM</div>
            <h3 className="text-3xl lg:text-4xl font-extrabold leading-tight">We bridge sports, gaming, and lifestyle by transforming collectibles into dynamic, cross-platform assets across mobile games</h3>
          </div>
          <div className="col-span-12 lg:col-span-6 flex justify-end">
            <div className="flex items-center gap-3">
              <button className="w-12 h-12 rounded border border-white/10 flex items-center justify-center">←</button>
              <button className="w-12 h-12 rounded border border-white/10 flex items-center justify-center">→</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
