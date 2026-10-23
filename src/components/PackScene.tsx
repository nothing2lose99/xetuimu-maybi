import { motion, useReducedMotion } from 'framer-motion';
import { type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { getSealEdgePath, getSealEdgeY, SEAL_START_X, SEAL_END_X } from './sealGeometry';

type PackSceneProps = {
  opening: boolean;
  ripReady: boolean;
  onRipComplete: () => void;
};

const PEEL_THRESHOLD = .7;
const PEEL_PARTICLE_STEP = .08;
const PACK_SPARKLE_COUNT = 42;
// Stable directions and staggered phases keep the field full without jumping on hover.
const PACK_SPARKLES = Array.from({ length: PACK_SPARKLE_COUNT }, (_, index) => {
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  const reach = .82 + (index % 5) * .045;
  const duration = 6.2 + (index % 7) * .45;
  const phase = ((index * 17) % PACK_SPARKLE_COUNT) / PACK_SPARKLE_COUNT;
  return {
    '--sparkle-size': `${10 + (index * 7) % 13}px`,
    '--sparkle-duration': `${duration}s`,
    '--sparkle-delay': `${-duration * phase}s`,
    '--sparkle-x': `${(Math.cos(angle) * 64 * reach).toFixed(2)}cqw`,
    '--sparkle-y': `${(Math.sin(angle) * 68 * reach).toFixed(2)}cqh`,
    color: ['#f7efff', '#d8bdff', '#bc91f4'][index % 3],
  } as CSSProperties;
});
const PACK_IMAGE = '/assets/MAYBi_pack_04_signature.png';
const PACK_ART_LEFT = .087;
const PACK_ART_RIGHT = .913;
const PACK_ART_WIDTH = PACK_ART_RIGHT - PACK_ART_LEFT;
const SEAL_EDGE_PATH = getSealEdgePath(1000);
const PACK_BODY_CLIP = `${SEAL_EDGE_PATH}V1500H0Z`;
const SEAL_TOP_CLIP = `${SEAL_EDGE_PATH}V0H0Z`;

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));

export function PackScene({ opening, ripReady, onRipComplete }: PackSceneProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const reduceMotion = useReducedMotion();
  const peelOverlayRef = useRef<HTMLDivElement>(null);
  const peelZoneRef = useRef<HTMLDivElement>(null);
  const ripMotionRef = useRef<HTMLDivElement>(null);
  const remainingSealRef = useRef<SVGRectElement>(null);
  const detachedSealClipRef = useRef<SVGRectElement>(null);
  const peeledSealRef = useRef<SVGGElement>(null);
  const peeledSealLiftRef = useRef<SVGGElement>(null);
  const peelEdgePathRef = useRef<SVGPathElement>(null);
  const particleLayerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const visualProgressRef = useRef(0);
  const pendingProgressRef = useRef(0);
  const paintFrameRef = useRef<number | null>(null);
  const motionFrameRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const pointerStartXRef = useRef(0);
  const pointerStartProgressRef = useRef(0);
  const peelDistanceRef = useRef(1);
  const lastParticleProgressRef = useRef(0);
  const particleNodesRef = useRef<Set<HTMLElement>>(new Set());
  const particleTimersRef = useRef<Set<number>>(new Set());
  const completedRef = useRef(false);

  useEffect(() => {
    let tiltFrame: number | null = null;
    let nextTilt = { x: 0, y: 0 };

    const resetTilt = () => {
      if (tiltFrame !== null) window.cancelAnimationFrame(tiltFrame);
      tiltFrame = null;
      setTilt({ x: 0, y: 0 });
    };

    if (ripReady || opening || reduceMotion) {
      resetTilt();
      return;
    }

    const updateTilt = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      nextTilt = {
        x: clamp(event.clientX / Math.max(1, window.innerWidth) - .5, -.5, .5),
        y: clamp(event.clientY / Math.max(1, window.innerHeight) - .5, -.5, .5),
      };
      if (tiltFrame !== null) return;
      tiltFrame = window.requestAnimationFrame(() => {
        tiltFrame = null;
        setTilt(nextTilt);
      });
    };

    window.addEventListener('pointermove', updateTilt, { passive: true });
    window.addEventListener('blur', resetTilt);
    return () => {
      if (tiltFrame !== null) window.cancelAnimationFrame(tiltFrame);
      window.removeEventListener('pointermove', updateTilt);
      window.removeEventListener('blur', resetTilt);
    };
  }, [opening, reduceMotion, ripReady]);

  const clearParticles = () => {
    particleNodesRef.current.forEach(node => node.remove());
    particleNodesRef.current.clear();
    particleTimersRef.current.forEach(window.clearTimeout);
    particleTimersRef.current.clear();
  };

  const drawPeelProgress = (rawProgress: number) => {
    const progress = clamp(rawProgress);
    progressRef.current = progress;
    visualProgressRef.current = progress;

    const overlay = peelOverlayRef.current;
    const zone = peelZoneRef.current;
    const tipX = SEAL_START_X + progress * (SEAL_END_X - SEAL_START_X);
    const tipYPercent = getSealEdgeY(tipX) / 1500 * 100;

    if (overlay) {
      overlay.style.setProperty('--peel-progress', progress.toFixed(4));
      overlay.style.setProperty('--peel-x', `${(PACK_ART_LEFT + progress * PACK_ART_WIDTH) * 100}%`);
      overlay.style.setProperty('--peel-y', `${tipYPercent}%`);
      overlay.style.setProperty('--glow-opacity', `${.28 + progress * .16}`);
    }

    zone?.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    zone?.setAttribute('aria-label', `Kéo để bóc seal, đã hoàn thành ${Math.round(progress * 100)}%`);
    ripMotionRef.current?.style.setProperty('--rip-progress', String(progress));

    const cutX = progress <= .001 ? SEAL_START_X : tipX;
    remainingSealRef.current?.setAttribute('x', String(cutX));
    remainingSealRef.current?.setAttribute('width', String(1000 - cutX));
    detachedSealClipRef.current?.setAttribute('width', String(cutX));
    peeledSealRef.current?.setAttribute('opacity', progress > .001 ? '1' : '0');
    const liftAngle = Math.sin(progress * Math.PI / 2) * 6;
    peeledSealLiftRef.current?.setAttribute('transform', `rotate(${liftAngle.toFixed(3)} ${tipX.toFixed(3)} ${getSealEdgeY(tipX).toFixed(3)})`);
    peelEdgePathRef.current?.setAttribute('d', progress > .001 ? getSealEdgePath(tipX, SEAL_START_X) : '');
    if (peelEdgePathRef.current) {
      const edgeOpacity = progress <= .82 ? 1 : clamp((1 - progress) / .18);
      peelEdgePathRef.current.style.opacity = edgeOpacity.toFixed(3);
    }
  };

  const queuePeelProgress = (progress: number) => {
    const next = Math.min(1, Math.max(0, progress));
    progressRef.current = next;
    pendingProgressRef.current = next;
    if (paintFrameRef.current !== null) return;
    paintFrameRef.current = window.requestAnimationFrame(() => {
      paintFrameRef.current = null;
      drawPeelProgress(pendingProgressRef.current);
    });
  };

  const removeOldestParticle = () => {
    const oldest = particleNodesRef.current.values().next().value as HTMLElement | undefined;
    if (oldest) {
      particleNodesRef.current.delete(oldest);
      oldest.remove();
    }
  };

  const spawnRipParticle = (progress: number) => {
    if (reduceMotion || !particleLayerRef.current) return;
    while (particleNodesRef.current.size >= 8) removeOldestParticle();
    const particle = document.createElement('span');
    particle.className = 'rip-particle';
    const duration = 350 + Math.random() * 350;
    const offsetX = (Math.random() * 2 - 1) * (15 + Math.random() * 15);
    const offsetY = (Math.random() * 2 - 1) * (10 + Math.random() * 10);
    const tipYPercent = getSealEdgeY(SEAL_START_X + progress * PACK_ART_WIDTH * 1000) / 1500 * 100;
    particle.style.left = `calc(${(PACK_ART_LEFT + progress * PACK_ART_WIDTH) * 100}% + ${offsetX}px)`;
    particle.style.top = `calc(${tipYPercent}% + ${offsetY}px)`;
    const travelX = (Math.random() * 2 - 1) * 18;
    const travelY = -8 - Math.random() * 16;
    particle.style.setProperty('--particle-dx', `${travelX}px`);
    particle.style.setProperty('--particle-dy', `${travelY}px`);
    particle.style.setProperty('--particle-mid-dx', `${travelX * .35}px`);
    particle.style.setProperty('--particle-mid-dy', `${travelY * .35}px`);
    particle.style.setProperty('--particle-scale', `${.65 + Math.random() * .65}`);
    particle.style.animationDuration = `${duration}ms`;
    particleLayerRef.current.appendChild(particle);
    particleNodesRef.current.add(particle);

    let timerId = 0;
    const removeParticle = () => {
      if (timerId) {
        window.clearTimeout(timerId);
        particleTimersRef.current.delete(timerId);
      }
      particleNodesRef.current.delete(particle);
      particle.remove();
    };
    particle.addEventListener('animationend', removeParticle, { once: true });
    timerId = window.setTimeout(removeParticle, duration + 120);
    particleTimersRef.current.add(timerId);
  };

  const spawnParticlesBetween = (previous: number, next: number) => {
    if (next <= previous) return;
    while (next >= lastParticleProgressRef.current + PEEL_PARTICLE_STEP) {
      lastParticleProgressRef.current += PEEL_PARTICLE_STEP;
      spawnRipParticle(lastParticleProgressRef.current);
    }
  };

  const cancelProgressMotion = () => {
    if (paintFrameRef.current !== null) {
      window.cancelAnimationFrame(paintFrameRef.current);
      paintFrameRef.current = null;
    }
    if (motionFrameRef.current !== null) {
      window.cancelAnimationFrame(motionFrameRef.current);
      motionFrameRef.current = null;
    }
  };

  const animateProgressTo = (target: number, duration: number, onComplete?: () => void) => {
    cancelProgressMotion();
    const start = visualProgressRef.current;
    if (duration <= 0 || Math.abs(target - start) < .001) {
      drawPeelProgress(target);
      onComplete?.();
      return;
    }
    const startedAt = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      drawPeelProgress(start + (target - start) * eased);
      if (elapsed < 1) motionFrameRef.current = window.requestAnimationFrame(tick);
      else {
        motionFrameRef.current = null;
        onComplete?.();
      }
    };
    motionFrameRef.current = window.requestAnimationFrame(tick);
  };

  const springPeelBack = () => {
    cancelProgressMotion();
    peelOverlayRef.current?.classList.add('is-resetting');
    let value = visualProgressRef.current;
    let velocity = 0;
    let previousTime = performance.now();
    const stiffness = reduceMotion ? 520 : 285;
    const damping = reduceMotion ? 42 : 25;
    const tick = (now: number) => {
      const delta = Math.min(.032, Math.max(.001, (now - previousTime) / 1000));
      previousTime = now;
      const acceleration = -stiffness * value - damping * velocity;
      velocity += acceleration * delta;
      value = Math.max(0, value + velocity * delta);
      drawPeelProgress(value);
      if (value > .001 || Math.abs(velocity) > .012) motionFrameRef.current = window.requestAnimationFrame(tick);
      else {
        motionFrameRef.current = null;
        drawPeelProgress(0);
        lastParticleProgressRef.current = 0;
        peelOverlayRef.current?.classList.remove('is-resetting');
      }
    };
    motionFrameRef.current = window.requestAnimationFrame(tick);
  };

  const completeRip = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    const activePointer = activePointerRef.current;
    if (activePointer !== null && peelZoneRef.current?.hasPointerCapture(activePointer)) {
      peelZoneRef.current.releasePointerCapture(activePointer);
    }
    activePointerRef.current = null;
    setDragging(false);
    peelOverlayRef.current?.classList.remove('is-dragging');
    const finish = () => {
      peelOverlayRef.current?.classList.add('is-completing');
      completionTimerRef.current = window.setTimeout(onRipComplete, reduceMotion ? 40 : 245);
    };
    animateProgressTo(1, reduceMotion ? 0 : Math.max(80, (1 - visualProgressRef.current) * 190), finish);
  };

  const getDragProgress = (clientX: number) => Math.min(1, Math.max(0,
    pointerStartProgressRef.current + (clientX - pointerStartXRef.current) / peelDistanceRef.current
  ));

  const startRip = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (opening || completedRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const currentTip = bounds.left + progressRef.current * bounds.width;
    // Keep the horizontal start tolerance tied to the seal width. The hit-area is
    // deliberately taller than the visible seal, so using its height here would
    // make dragging start too far away from the current peel handle.
    const hitSlop = Math.max(38, Math.min(56, bounds.width * .15));
    if (Math.abs(event.clientX - currentTip) > hitSlop) return;
    event.preventDefault();
    event.stopPropagation();
    cancelProgressMotion();
    peelOverlayRef.current?.classList.remove('is-resetting');
    activePointerRef.current = event.pointerId;
    pointerStartXRef.current = event.clientX;
    pointerStartProgressRef.current = progressRef.current;
    peelDistanceRef.current = Math.max(1, bounds.width);
    lastParticleProgressRef.current = Math.floor(progressRef.current / PEEL_PARTICLE_STEP) * PEEL_PARTICLE_STEP;
    event.currentTarget.setPointerCapture(event.pointerId);
    peelOverlayRef.current?.classList.add('is-dragging');
    setDragging(true);
  };

  const moveRip = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId || completedRef.current) return;
    event.preventDefault();
    const previous = progressRef.current;
    const next = getDragProgress(event.clientX);
    queuePeelProgress(next);
    spawnParticlesBetween(previous, next);
    if (next >= .998) completeRip();
  };

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    activePointerRef.current = null;
    peelOverlayRef.current?.classList.remove('is-dragging');
    setDragging(false);
  };

  const endRip = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId || completedRef.current) return;
    event.preventDefault();
    const next = getDragProgress(event.clientX);
    cancelProgressMotion();
    drawPeelProgress(next);
    releasePointer(event);
    if (next >= PEEL_THRESHOLD) completeRip();
    else springPeelBack();
  };

  const cancelRip = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId || completedRef.current) return;
    releasePointer(event);
    springPeelBack();
  };

  const handleRipKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'End' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      completeRip();
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      springPeelBack();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      cancelProgressMotion();
      const previous = progressRef.current;
      const next = Math.min(1, Math.max(0, previous + (event.key === 'ArrowRight' ? .08 : -.08)));
      drawPeelProgress(next);
      spawnParticlesBetween(previous, next);
      if (next >= .998) completeRip();
    }
  };

  useEffect(() => {
    if (!ripReady) return;
    completedRef.current = false;
    activePointerRef.current = null;
    lastParticleProgressRef.current = 0;
    setDragging(false);
    const frame = window.requestAnimationFrame(() => drawPeelProgress(0));
    return () => window.cancelAnimationFrame(frame);
  }, [ripReady]);

  useEffect(() => () => {
    if (paintFrameRef.current !== null) window.cancelAnimationFrame(paintFrameRef.current);
    if (motionFrameRef.current !== null) window.cancelAnimationFrame(motionFrameRef.current);
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    clearParticles();
  }, []);

  const surfaceLightStyle = {
    '--surface-light-opacity': `${.99 + (Math.abs(tilt.x) + Math.abs(tilt.y)) * .26}`,
    '--rim-light-left': `${.08 + Math.max(0, -tilt.x * 2) * .82}`,
    '--rim-light-right': `${.08 + Math.max(0, tilt.x * 2) * .82}`,
  } as CSSProperties;

  return <div className={`pack-scene ${ripReady ? 'rip-active' : ''}`}>
    <div className="peel-scene-sparkles" aria-hidden="true">
      {PACK_SPARKLES.map((style, index) =>
        <span className="scene-sparkle" key={index} style={style} />
      )}
    </div>
    <motion.div
      className={`pack-image-button ${ripReady ? 'rip-ready' : ''} ${opening ? 'opening' : ''}`}
      transformTemplate={(_, generatedTransform) => `translateX(-50%) ${generatedTransform}`}
      animate={opening ? { scale: [1, 1.08, .95, 1.25], rotate: [0, -2, 2, 0], opacity: [1, 1, 1, 0] } : ripReady ? { rotateX: 0, rotateY: 0, y: 0, scale: 1.035, opacity: 1 } : { rotateX: -tilt.y * 22, rotateY: tilt.x * 30, y: [0, -7, 0], scale: 1, opacity: 1 }}
      transition={opening ? { duration: 1.25 } : ripReady ? { duration: .3 } : { y: { repeat: Infinity, duration: 3.4, ease: 'easeInOut' }, rotateX: { duration: .18 }, rotateY: { duration: .18 } }}
      style={surfaceLightStyle}
    >
      <div className="pack-rip-motion" ref={ripMotionRef}>
      <div className="pack-body-layer">
        <svg className="pack-art pack-art-svg" viewBox="0 0 1000 1500" role="img" aria-label="MAYBI Signature Fashion Pack">
          <defs>
            <clipPath id="pack-body-clip"><path d={PACK_BODY_CLIP} /></clipPath>
          </defs>
          <image
            href={PACK_IMAGE}
            width="1000"
            height="1500"
            preserveAspectRatio="none"
            clipPath={ripReady || opening ? 'url(#pack-body-clip)' : undefined}
          />
        </svg>
        <span className="pack-surface-light" aria-hidden="true" />
      </div>
      {ripReady && <div className={`pack-rip-overlay ${dragging ? 'is-dragging' : ''}`} ref={peelOverlayRef}>
        <p className="rip-instruction">Giữ và kéo sang phải để mở</p>
        <svg className="peel-foil-svg" viewBox="0 0 1000 1500" aria-hidden="true">
          <defs>
            <clipPath id="seal-top-clip"><path d={SEAL_TOP_CLIP} /></clipPath>
            <clipPath id="remaining-seal-clip"><rect ref={remainingSealRef} width="1000" height="1500" /></clipPath>
            <clipPath id="detached-seal-clip"><rect ref={detachedSealClipRef} width="0" height="1500" /></clipPath>
          </defs>
          <g clipPath="url(#seal-top-clip)">
            <image href={PACK_IMAGE} width="1000" height="1500" preserveAspectRatio="none" clipPath="url(#remaining-seal-clip)" />
          </g>
          <path className="peel-edge" ref={peelEdgePathRef} />
          <g className="peeled-seal" ref={peeledSealRef} opacity="0">
            <g className="peeled-seal-flight">
              <g className="peeled-seal-lift" ref={peeledSealLiftRef}>
                <g clipPath="url(#seal-top-clip)">
                  <image href={PACK_IMAGE} width="1000" height="1500" preserveAspectRatio="none" clipPath="url(#detached-seal-clip)" />
                </g>
              </g>
            </g>
          </g>
        </svg>
        <div className="rip-glow" aria-hidden="true" />
        <div className="rip-particle-layer" ref={particleLayerRef} aria-hidden="true" />
        <div className="peel-complete-flash" aria-hidden="true" />
        <span className="rip-handle" aria-hidden="true"><span className="rip-grip-core" /></span>
        <div
          className="rip-zone"
          ref={peelZoneRef}
          role="slider"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-label="Kéo để bóc seal, đã hoàn thành 0%"
          onPointerDown={startRip}
          onPointerMove={moveRip}
          onPointerUp={endRip}
          onPointerCancel={cancelRip}
          onLostPointerCapture={cancelRip}
          onKeyDown={handleRipKey}
        />
      </div>}
      </div>
    </motion.div>
  </div>
}
