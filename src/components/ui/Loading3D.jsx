import { useMemo } from 'react';

export default function Loading3D({
  style,
  size = 180,
  speed = 1,
  className = '',
  autoplay = true,
  loop = true,
}) {
  const duration = useMemo(() => `${Math.max(0.7, 1.6 / Math.max(speed || 1, 0.25))}s`, [speed]);
  const showCaption = size >= 72;
  const orbitSize = Math.max(18, size * 0.34);
  const coreSize = Math.max(8, size * 0.16);

  return (
    <div
      className={`loading-modern ${className}`}
      style={{
        width: size,
        minHeight: size,
        margin: '0 auto',
        ...style,
      }}
    >
      <div
        className={`loading-modern-shell ${autoplay && loop ? 'is-animated' : ''}`}
        style={{
          '--loading-duration': duration,
          '--loading-orbit-size': `${orbitSize}px`,
          '--loading-core-size': `${coreSize}px`,
        }}
      >
        <div className="loading-modern-grid" />
        <div className="loading-modern-ring loading-modern-ring-a" />
        <div className="loading-modern-ring loading-modern-ring-b" />
        <div className="loading-modern-core">
          <span />
        </div>
      </div>

      {showCaption && (
        <div className="loading-modern-copy">
          <div className="loading-modern-line loading-modern-line-main" />
          <div className="loading-modern-line loading-modern-line-sub" />
        </div>
      )}

      <style>{`
        .loading-modern {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }

        .loading-modern-shell {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          border-radius: 28px;
          background:
            radial-gradient(circle at top, rgba(59, 130, 246, 0.18), transparent 38%),
            linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.82));
          border: 1px solid rgba(148, 163, 184, 0.22);
          box-shadow:
            0 16px 38px rgba(15, 23, 42, 0.08),
            inset 0 1px 0 rgba(255,255,255,0.7);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
        }

        .loading-modern-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px);
          background-size: 100% 22px, 22px 100%;
          mask-image: radial-gradient(circle at center, black, transparent 78%);
        }

        .loading-modern-ring {
          position: absolute;
          width: var(--loading-orbit-size);
          height: var(--loading-orbit-size);
          border-radius: 999px;
          border: 2px solid transparent;
          mix-blend-mode: multiply;
        }

        .loading-modern-ring-a {
          border-top-color: #2563eb;
          border-left-color: rgba(37, 99, 235, 0.35);
        }

        .loading-modern-ring-b {
          width: calc(var(--loading-orbit-size) * 1.45);
          height: calc(var(--loading-orbit-size) * 1.45);
          border-bottom-color: #14b8a6;
          border-right-color: rgba(20, 184, 166, 0.32);
        }

        .loading-modern-shell.is-animated .loading-modern-ring-a {
          animation: loadingModernSpin var(--loading-duration) linear infinite;
        }

        .loading-modern-shell.is-animated .loading-modern-ring-b {
          animation: loadingModernSpinReverse calc(var(--loading-duration) * 1.4) linear infinite;
        }

        .loading-modern-core {
          width: var(--loading-core-size);
          height: var(--loading-core-size);
          border-radius: 999px;
          background: linear-gradient(135deg, #1d4ed8, #38bdf8);
          box-shadow:
            0 0 0 8px rgba(59, 130, 246, 0.08),
            0 14px 28px rgba(37, 99, 235, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        .loading-modern-core span {
          width: 36%;
          height: 36%;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.95);
        }

        .loading-modern-shell.is-animated .loading-modern-core {
          animation: loadingModernPulse calc(var(--loading-duration) * 1.45) ease-in-out infinite;
        }

        .loading-modern-copy {
          width: min(100%, 132px);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .loading-modern-line {
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            rgba(226, 232, 240, 0.75) 0%,
            rgba(191, 219, 254, 0.95) 50%,
            rgba(226, 232, 240, 0.75) 100%
          );
          background-size: 200% 100%;
        }

        .loading-modern-line-main {
          width: 100%;
        }

        .loading-modern-line-sub {
          width: 68%;
        }

        .loading-modern-shell.is-animated ~ .loading-modern-copy .loading-modern-line {
          animation: loadingModernShimmer calc(var(--loading-duration) * 1.8) ease-in-out infinite;
        }

        @keyframes loadingModernSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes loadingModernSpinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes loadingModernPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }

        @keyframes loadingModernShimmer {
          0% { background-position: 200% 0; opacity: 0.72; }
          50% { opacity: 1; }
          100% { background-position: -200% 0; opacity: 0.72; }
        }

        @media (prefers-reduced-motion: reduce) {
          .loading-modern-shell.is-animated .loading-modern-ring-a,
          .loading-modern-shell.is-animated .loading-modern-ring-b,
          .loading-modern-shell.is-animated .loading-modern-core,
          .loading-modern-shell.is-animated ~ .loading-modern-copy .loading-modern-line {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
