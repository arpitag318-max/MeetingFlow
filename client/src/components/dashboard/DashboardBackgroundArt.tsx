import React from "react";

export const DashboardBackgroundArt: React.FC = () => {
  return (
    <div
      className="absolute top-0 right-0 w-full max-w-4xl h-[420px] pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      <svg
        className="absolute top-0 right-0 w-full h-full"
        viewBox="0 0 900 450"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMin slice"
      >
        <defs>
          <linearGradient id="coralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9D9D" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FFC5AA" stopOpacity="0.08" />
          </linearGradient>

          <linearGradient id="peachGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFC5AA" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#EEF8CD" stopOpacity="0.10" />
          </linearGradient>

          <linearGradient id="mintGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#BBF1D2" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="ivorySoftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EEF8CD" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Soft Organic Curved Geometries */}
        {/* Large Coral/Peach Arch in Top Right */}
        <path
          d="M 520 -40 C 650 30, 780 120, 880 260 L 920 -40 Z"
          fill="url(#coralGrad)"
        />

        {/* Secondary Overlapping Peach Ellipse */}
        <ellipse
          cx="720"
          cy="90"
          rx="210"
          ry="140"
          fill="url(#peachGrad)"
          transform="rotate(-15 720 90)"
        />

        {/* Soft Mint Arc sweeping below */}
        <path
          d="M 440 80 C 560 180, 680 220, 840 240 C 740 320, 580 340, 460 260 Z"
          fill="url(#mintGrad)"
        />

        {/* Warm Ivory / Cream Accent Shape */}
        <circle
          cx="600"
          cy="60"
          r="110"
          fill="url(#ivorySoftGrad)"
        />

        {/* Fine Abstract Architectural Lines */}
        <path
          d="M 380 -20 C 500 120, 640 220, 880 300"
          stroke="#E0D2C2"
          strokeWidth="1.2"
          strokeOpacity="0.6"
        />

        <path
          d="M 430 -40 C 570 110, 720 200, 920 240"
          stroke="#E0D2C2"
          strokeWidth="1.2"
          strokeOpacity="0.45"
        />

        <path
          d="M 560 -30 C 660 70, 780 150, 920 180"
          stroke="#E85555"
          strokeWidth="0.8"
          strokeOpacity="0.25"
        />

        {/* Concentric Architectural Rings */}
        <circle
          cx="740"
          cy="80"
          r="160"
          stroke="#E0D2C2"
          strokeWidth="1"
          strokeOpacity="0.35"
          strokeDasharray="4 6"
        />

        <circle
          cx="740"
          cy="80"
          r="230"
          stroke="#E0D2C2"
          strokeWidth="1"
          strokeOpacity="0.25"
        />

        {/* Vertical/Diagonal Architectural Guideline */}
        <line
          x1="520"
          y1="-20"
          x2="780"
          y2="380"
          stroke="#E0D2C2"
          strokeWidth="0.8"
          strokeOpacity="0.35"
          strokeDasharray="3 5"
        />
      </svg>
    </div>
  );
};
