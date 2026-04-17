import { useMemo } from 'react';

export default function Loading3D({
  style,
  size = 180,
  speed = 1,
  className = '',
  autoplay = true,
  loop = true,
}) {
  const duration = useMemo(
    () => `${Math.max(0.7, 1.6 / Math.max(speed || 1, 0.25))}s`,
    [speed]
  );

  const isAnimated = autoplay && loop;
  const isCompact = size < 48;
  const showCaption = size >= 72;

  // Scale proportions
  const ringOuter = Math.max(20, size * 0.38);
  const ringInner = Math.max(16, size * 0.28);
  const coreSize = Math.max(6, size * 0.14);
  const strokeWidth = Math.max(2, size * 0.018);

  // Compact mode: simple ring spinner
  if (isCompact) {
    return (
      <div
        className={`ld3-root ${className}`}
        style={{ width: size, height: size, ...style }}
      >
        <div
          className={`ld3-mini ${isAnimated ? 'ld3-anim' : ''}`}
          style={{
            width: size,
            height: size,
            '--ld3-dur': duration,
            '--ld3-stroke': `${Math.max(2, size * 0.1)}px`,
          }}
        />
        <style>{compactStyles}</style>
      </div>
    );
  }

  return (
    <div
      className={`ld3-root ${className}`}
      style={{ width: size, minHeight: size, ...style }}
    >
      <div
        className={`ld3-shell ${isAnimated ? 'ld3-anim' : ''}`}
        style={{
          '--ld3-dur': duration,
          '--ld3-ring-outer': `${ringOuter}px`,
          '--ld3-ring-inner': `${ringInner}px`,
          '--ld3-core': `${coreSize}px`,
          '--ld3-stroke': `${strokeWidth}px`,
        }}
      >
        {/* Outer ring */}
        <div className="ld3-ring ld3-ring-a" />
        {/* Inner ring */}
        <div className="ld3-ring ld3-ring-b" />
        {/* Core dot */}
        <div className="ld3-core">
          <span />
        </div>
      </div>

      {showCaption && (
        <div className="ld3-caption">
          <div className="ld3-bar ld3-bar-1" />
          <div className="ld3-bar ld3-bar-2" />
        </div>
      )}

      <style>{fullStyles}</style>
    </div>
  );
}

/* ---- Compact spinner (size < 48) ---- */
const compactStyles = `
  .ld3-root {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ld3-mini {
    border-radius: 50%;
    border: var(--ld3-stroke) solid var(--border, #e2e8f0);
    border-top-color: var(--primary, #2563eb);
  }

  .ld3-mini.ld3-anim {
    animation: ld3Spin var(--ld3-dur) linear infinite;
  }

  @keyframes ld3Spin {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .ld3-mini.ld3-anim { animation: none !important; }
  }
`;

/* ---- Full loader (size >= 48) ---- */
const fullStyles = `
  .ld3-root {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin: 0 auto;
  }

  /* Shell — clean circle area, no box/grid */
  .ld3-shell {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Rings */
  .ld3-ring {
    position: absolute;
    border-radius: 50%;
    border: var(--ld3-stroke) solid transparent;
  }

  .ld3-ring-a {
    width: var(--ld3-ring-outer);
    height: var(--ld3-ring-outer);
    border-top-color: var(--primary, #2563eb);
    border-left-color: color-mix(in srgb, var(--primary, #2563eb) 30%, transparent);
  }

  .ld3-ring-b {
    width: var(--ld3-ring-inner);
    height: var(--ld3-ring-inner);
    border-bottom-color: var(--secondary, #6366f1);
    border-right-color: color-mix(in srgb, var(--secondary, #6366f1) 30%, transparent);
  }

  /* Core dot */
  .ld3-core {
    width: var(--ld3-core);
    height: var(--ld3-core);
    border-radius: 50%;
    background: var(--primary, #2563eb);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary, #2563eb) 10%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

  .ld3-core span {
    width: 36%;
    height: 36%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
  }

  /* Animations */
  .ld3-anim .ld3-ring-a {
    animation: ld3Spin var(--ld3-dur) linear infinite;
  }

  .ld3-anim .ld3-ring-b {
    animation: ld3SpinRev calc(var(--ld3-dur) * 1.4) linear infinite;
  }

  .ld3-anim .ld3-core {
    animation: ld3Pulse calc(var(--ld3-dur) * 1.5) ease-in-out infinite;
  }

  /* Caption shimmer bars */
  .ld3-caption {
    width: min(100%, 120px);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ld3-bar {
    height: 8px;
    border-radius: 4px;
    background: var(--border, #e2e8f0);
    background-image: linear-gradient(
      90deg,
      var(--border, #e2e8f0) 0%,
      color-mix(in srgb, var(--primary, #2563eb) 18%, var(--border, #e2e8f0)) 50%,
      var(--border, #e2e8f0) 100%
    );
    background-size: 200% 100%;
  }

  .ld3-bar-1 { width: 100%; }
  .ld3-bar-2 { width: 65%; }

  .ld3-anim ~ .ld3-caption .ld3-bar {
    animation: ld3Shimmer calc(var(--ld3-dur) * 1.8) ease-in-out infinite;
  }

  /* Keyframes */
  @keyframes ld3Spin {
    to { transform: rotate(360deg); }
  }

  @keyframes ld3SpinRev {
    to { transform: rotate(-360deg); }
  }

  @keyframes ld3Pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.12); opacity: 0.85; }
  }

  @keyframes ld3Shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .ld3-anim .ld3-ring-a,
    .ld3-anim .ld3-ring-b,
    .ld3-anim .ld3-core,
    .ld3-anim ~ .ld3-caption .ld3-bar {
      animation: none !important;
    }
  }
`;
