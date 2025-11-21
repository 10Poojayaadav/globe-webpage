import React, { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import { motion, AnimatePresence } from "framer-motion";

/**
 * HomepageAnimation.js
 * - Option A: Perfect half-globe (top hemisphere visible)
 * - Pins projected from lat/lng using globe rotation from cobe
 * - Sequential player card popups anchored above pins
 * - Ecosystem text block below the half-globe
 *
 * Local uploaded reference file (used as placeholder images): /mnt/data/VID_20251121_130742.mp4
 */

const REF_VIDEO = "/mnt/data/VID_20251121_130742.mp4"; // uploaded asset (use as placeholder or replace with real images)

const players = [
  { id: 1, name: "Faouzi Ghoulam", team: "Napoli", location: "Algeria / Italy", mapCoord: [36, 3], headshot: REF_VIDEO },
  { id: 2, name: "Kalidou Koulibaly", team: "Al Hilal", location: "Senegal / Saudi Arabia", mapCoord: [14, -17], headshot: REF_VIDEO },
  { id: 3, name: "Killian Hayes", team: "Detroit Pistons", location: "France / USA", mapCoord: [47, -2], headshot: REF_VIDEO },
];

const SHOW_MS = 1400;
const FADE_MS = 300;
const LOOPS = 1;

export default function HomepageAnimation() {
  // layout refs
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const globeRef = useRef(null);

  // cinematic sizes (we'll render a square canvas but mask bottom half)
  const [size, setSize] = useState({ w: 920, h: 460 }); // h is full sphere height; we will clip bottom half with CSS

  // sequence state
  const [activeIndex, setActiveIndex] = useState(null);
  const [running, setRunning] = useState(true);
  const [loopsDone, setLoopsDone] = useState(0);
  const targetPhi = useRef(null);

  useEffect(() => {
    function onResize() {
      const maxW = Math.min(window.innerWidth - 64, 1200);
      const w = Math.max(560, Math.min(980, Math.round(maxW * 0.65)));
      // keep square canvas so projection math is straightforward (sphere fits)
      setSize({ w, h: w });
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // create globe with cobe
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;

    // initial camera angles produce a top-hemisphere-forward view
    let phi = Math.PI * 0.45; // rotate so center shows roughly the top-right hemisphere by default
    let theta = 0.45; // tilt

    const globe = createGlobe(canvas, {
      devicePixelRatio: ratio,
      width: size.w * 2,
      height: size.h * 2,
      phi,
      theta,
      dark: 1,
      diffuse: 1.25,
      mapSamples: 14000,
      mapBrightness: 6.3,
      baseColor: [0.04, 0.04, 0.04],
      markerColor: [1, 0.45, 0.2],
      glowColor: [0.98, 0.98, 0.98],
      body: 0,
      markers: players.map((p) => ({ location: p.mapCoord, size: 0.03 })),
      onRender: (state) => {
        // gently rotate and interpolate toward any targetPhi set by the sequence
        const t = targetPhi.current;
        if (typeof t === "number") {
          // interpolate phi toward t
          const diff = t - phi;
          phi += diff * 0.06; // interpolation strength
        } else {
          // slow idle rotation
          phi += 0.0006;
        }
        state.phi = phi;
        state.theta = theta;
        globeRef.current = { state, phi, theta };
      },
    });

    return () => globe.destroy();
  }, [size.w, size.h]);

  // convert long -> target phi for centering marker (rough mapping)
  function lonToPhi(lon) {
    // globe phi is in radians; simple mapping (negate lon)
    return -((lon * Math.PI) / 180);
  }

  // project lat/lon to screen coords relative to wrapperRef (taking current globe rotation into account)
  function latLngToScreen(lat, lng) {
    if (!globeRef.current || !wrapperRef.current) return { x: -9999, y: -9999, visible: false };
    const { phi } = globeRef.current;
    // spherical coords
    const lambda = (lng * Math.PI) / 180;
    const phiLat = (lat * Math.PI) / 180;

    // cartesian (unit sphere)
    const x = Math.cos(phiLat) * Math.cos(lambda);
    const y = Math.sin(phiLat);
    const z = Math.cos(phiLat) * Math.sin(lambda);

    // rotate by current phi (around Y)
    const rot = phi;
    const xr = x * Math.cos(rot) + z * Math.sin(rot);
    const zr = -x * Math.sin(rot) + z * Math.cos(rot);

    // projection on square canvas
    const R = Math.min(size.w, size.h) / 2;
    const scale = R * 0.95;
    const sx = size.w / 2 + xr * scale;
    const sy = size.h / 2 - y * scale; // invert y for screen coords

    const visible = zr > 0.02; // front hemisphere threshold
    return { x: sx, y: sy, visible };
  }

  // run sequence: loop over players, show each for SHOW_MS, move globe to longitude, then hide
  useEffect(() => {
    let mounted = true;
    let timer = null;

    async function run() {
      let idx = 0;
      let localLoop = 0;
      while (mounted && running) {
        // set target camera to center next player
        const lon = players[idx].mapCoord[1];
        targetPhi.current = lonToPhi(lon);

        // show card
        setActiveIndex(idx);
        await new Promise((res) => (timer = setTimeout(res, SHOW_MS)));
        if (!mounted) break;

        // hide card
        setActiveIndex(null);
        await new Promise((res) => (timer = setTimeout(res, FADE_MS)));
        if (!mounted) break;

        idx = (idx + 1) % players.length;
        if (idx === 0) {
          localLoop += 1;
          setLoopsDone(localLoop);
          if (localLoop >= LOOPS) {
            // stop automatic sequence; keep the last camera orientation
            setRunning(false);
            targetPhi.current = null;
            // leave the globe visible; text below remains
            break;
          }
        }
      }
    }

    run();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // card animation variants
  const cardVariants = {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    enter: { opacity: 1, y: 0, scale: 1, transition: { duration: FADE_MS / 1000, ease: "easeOut" } },
    exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: FADE_MS / 1000 } },
  };

  return (
    <div className="min-h-screen bg-black text-white antialiased">
      {/* top hero area containing the half-globe */}
      <section className="relative flex items-start justify-center pt-12 pb-8">
        <div className="w-full max-w-7xl px-6">
          <div className="flex flex-col items-center">
            {/* Cinematic wrapper - center horizontally */}
            <div
              ref={wrapperRef}
              className="relative rounded-2xl mx-auto overflow-hidden"
              style={{
                width: size.w,
                height: size.h / 2, // we only show top half — clip to half height
                background: "#050507",
                border: "1px solid rgba(255,255,255,0.04)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.7), inset 0 40px 80px rgba(255,255,255,0.01)",
              }}
            >
              {/* We render a full square canvas (size.h tall) but place it such that only the top half shows inside this wrapper.
                  This keeps projection math simple (we used size.w x size.h canvas earlier). */}
              <div style={{ position: "absolute", left: 0, top: `-${size.h / 2}px`, width: size.w, height: size.h, overflow: "visible" }}>
                <canvas
                  ref={canvasRef}
                  width={Math.round(size.w * 2)}
                  height={Math.round(size.h * 2)}
                  style={{
                    width: size.w,
                    height: size.h,
                    display: "block",
                    transform: "translateZ(0)",
                  }}
                />
              </div>

              {/* thin inner border/gloss like video */}
              <div style={{ position: "absolute", inset: 6, borderRadius: 18, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)", pointerEvents: "none" }} />

              {/* Pins: compute projected position and render only if visible (front hemisphere) */}
              {players.map((p) => {
                const pos = latLngToScreen(p.mapCoord[0], p.mapCoord[1]);
                // because canvas is rendered full height and our wrapper shows only top half,
                // we must subtract half the canvas (we positioned canvas with top = -size.h/2)
                const adjustedY = pos.y - size.h / 2;
                const visible = pos.visible && adjustedY >= 0 && adjustedY <= size.h / 2;
                return (
                  <div key={p.id} style={{ position: "absolute", left: pos.x, top: adjustedY, transform: "translate(-50%,-50%)", pointerEvents: visible ? "auto" : "none", opacity: visible ? 1 : 0.15 }}>
                    <button
                      onClick={() => {
                        // manual activate pin (also center camera)
                        setActiveIndex(players.findIndex((pl) => pl.id === p.id));
                        targetPhi.current = lonToPhi(p.mapCoord[1]);
                        setRunning(false); // stop automatic sequence when user interacts
                      }}
                      aria-label={p.name}
                      className="relative flex items-center justify-center"
                      style={{ width: 32, height: 32 }}
                    >
                      {/* outer glow */}
                      <span style={{ position: "absolute", width: 36, height: 36, borderRadius: 999, background: "rgba(255,120,60,0.06)", filter: "blur(6px)", animation: "pinPulse 1.6s infinite ease-out" }} />
                      {/* halo */}
                      <span style={{ position: "absolute", width: 18, height: 18, borderRadius: 999, boxShadow: "0 0 14px rgba(255,102,51,0.9)" }} />
                      {/* core dot */}
                      <span style={{ width: 8, height: 8, borderRadius: 10, background: "rgb(255,102,51)", position: "relative", zIndex: 10 }} />
                    </button>
                  </div>
                );
              })}

              {/* Active player card anchored to the active pin's location (if within visible area).
                  If the pin is not visible in the top half, fallback to top-center. */}
              <AnimatePresence>
                {activeIndex !== null && (() => {
                  const p = players[activeIndex];
                  const pos = latLngToScreen(p.mapCoord[0], p.mapCoord[1]);
                  const adjustedY = pos.y - size.h / 2;
                  const visible = pos.visible && adjustedY >= 0 && adjustedY <= size.h / 2;
                  // anchor card above the pin, but keep within wrapper by clamping
                  const left = Math.max(60, Math.min(size.w - 60, pos.x));
                  const top = visible ? Math.max(36, adjustedY - 72) : 36; // y above pin or default
                  return (
                    <motion.div
                      key={p.id}
                      variants={cardVariants}
                      initial="initial"
                      animate="enter"
                      exit="exit"
                      style={{
                        position: "absolute",
                        left,
                        top,
                        transform: "translate(-50%, 0)",
                        zIndex: 50,
                        width: 180,
                        pointerEvents: "auto"
                      }}
                      className="rounded-md p-2 bg-black/60 backdrop-blur-md border border-white/10 shadow-lg"
                      onClick={() => setActiveIndex(null)}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-900 border border-white/6 flex-shrink-0">
                          <img src={p.headshot} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{p.name}</div>
                          <div className="text-xs text-gray-300">{p.team} • {p.location}</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              <style>{`
                @keyframes pinPulse {
                  0% { transform: scale(0.9); opacity: 0.85; }
                  70% { transform: scale(1.35); opacity: 0; }
                  100% { transform: scale(1.6); opacity: 0; }
                }
              `}</style>
            </div>

            {/* Content below the half-globe (visible under the cut) */}
            <div className="w-full max-w-3xl mt-8 text-center">
              <h2 className="text-2xl lg:text-3xl font-extrabold">Global Presence</h2>
              <p className="text-gray-400 mt-2">Tap pins to see player cards that emerge from the globe.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Text Block as separate full section below */}
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
