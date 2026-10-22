import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Fast, snappy cubic bezier matching fast-out crisp stop
 */
function solveCubicBezier(x, p1x = 0.25, p1y = 0.0, p2x = 0.0, p2y = 1.0) {
  let t = x;
  for (let i = 0; i < 6; i++) {
    const currentX = 3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
    const currentSlope = 3 * (1 - t) * (1 - t) * p1x + 6 * (1 - t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
    if (Math.abs(currentSlope) < 1e-5) break;
    t -= (currentX - x) / currentSlope;
    t = Math.max(0, Math.min(1, t));
  }
  return 3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
}

export default function AnimatedBorderFrame({ isIntroActive, onBorderComplete }) {
  const containerRef = useRef(null);
  const onBorderCompleteRef = useRef(onBorderComplete);
  onBorderCompleteRef.current = onBorderComplete;

  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? Math.max(300, window.innerWidth - 72) : 1400,
    height: typeof window !== 'undefined' ? Math.max(200, window.innerHeight - 54) : 700
  }));

  const [progress, setProgress] = useState(0);
  const [showCapsule, setShowCapsule] = useState(isIntroActive);
  const [capsuleFading, setCapsuleFading] = useState(false);

  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current?.parentElement) {
        const rect = containerRef.current.parentElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current?.parentElement) {
      observer.observe(containerRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isIntroActive) {
      setProgress(100);
      setShowCapsule(false);
      setCapsuleFading(true);
      return;
    }

    setProgress(0);
    setShowCapsule(true);
    setCapsuleFading(false);

    let animId = null;
    let fadeTimer = null;
    const startDelay = 80;
    const duration = 950;
    const startTime = performance.now() + startDelay;

    const step = (now) => {
      if (now < startTime) {
        setProgress(0);
        animId = requestAnimationFrame(step);
        return;
      }

      const elapsed = now - startTime;
      const rawFraction = Math.min(1, Math.max(0, elapsed / duration));
      const easedFraction = solveCubicBezier(rawFraction, 0.25, 0.0, 0.0, 1.0);
      const currentPct = Math.round(easedFraction * 100);
      setProgress(currentPct);

      if (rawFraction < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setProgress(100);
        onBorderCompleteRef.current?.();
        setCapsuleFading(true);
        fadeTimer = setTimeout(() => {
          setShowCapsule(false);
        }, 150);
      }
    };

    animId = requestAnimationFrame(step);

    return () => {
      clearTimeout(fadeTimer);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isIntroActive]);

  const { width, height } = dimensions;
  // Thicker 4px stroke with matching edge offset
  const strokeWidth = 4;
  const offset = strokeWidth / 2;
  const left = offset;
  const top = offset;
  const right = Math.max(left + 10, width - offset);
  const bottom = Math.max(top + 10, height - offset);
  const midX = width / 2;

  // Strict 0px Radius Razor-Sharp Geometric Tracing:
  // Bottom-Center -> Bottom-Left -> Top-Left -> Top-Right -> Bottom-Right -> Bottom-Center
  const pathD = [
    `M ${midX.toFixed(2)} ${bottom.toFixed(2)}`,
    `L ${left.toFixed(2)} ${bottom.toFixed(2)}`,
    `L ${left.toFixed(2)} ${top.toFixed(2)}`,
    `L ${right.toFixed(2)} ${top.toFixed(2)}`,
    `L ${right.toFixed(2)} ${bottom.toFixed(2)}`,
    `L ${midX.toFixed(2)} ${bottom.toFixed(2)}`,
    'Z'
  ].join(' ');

  return (
    <div ref={containerRef} className="animated-border-container bold-border-container">
      <svg
        className={`animated-border-svg ${isIntroActive ? 'animating' : 'completed'}`}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <path
          d={pathD}
          pathLength="1000"
          className="animated-border-path bold-border-path"
        />
      </svg>

      {/* Sharp 0px Monospace Percentage Indicator */}
      {showCapsule && (
        <div
          className={`border-progress-capsule bold-progress-badge ${capsuleFading ? 'capsule-fade-out fading-out' : 'capsule-visible'}`}
          style={{
            left: `${midX}px`
          }}
        >
          <span className="bold-progress-dot">■</span>
          <span className="bold-progress-text">{progress}% FRAME INITIALIZED</span>
        </div>
      )}
    </div>
  );
}
