import React from 'react';

interface RiskGaugeProps {
  score: number;
  size?: number;
  showLabels?: boolean;
  animate?: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  size = 180,
  showLabels = true,
}) => {
  const normalizedScore = Math.min(100, Math.max(0, score));

  // Determine colors based on risk
  let strokeColor = '#10b981'; // emerald
  let textColor = 'text-emerald-400';
  let bgColor = 'bg-emerald-500/10';
  let borderColor = 'border-emerald-500/20';
  let label = 'LOW RISK';

  if (normalizedScore > 90) {
    strokeColor = '#e11d48'; // rose/crimson
    textColor = 'text-rose-400';
    bgColor = 'bg-rose-500/10';
    borderColor = 'border-rose-500/30';
    label = 'CRITICAL RISK';
  } else if (normalizedScore >= 71) {
    strokeColor = '#f43f5e'; // red
    textColor = 'text-rose-400';
    bgColor = 'bg-rose-500/10';
    borderColor = 'border-rose-500/30';
    label = 'HIGH RISK';
  } else if (normalizedScore >= 31) {
    strokeColor = '#f59e0b'; // amber
    textColor = 'text-amber-400';
    bgColor = 'bg-amber-500/10';
    borderColor = 'border-amber-500/30';
    label = 'MEDIUM RISK';
  }

  // SVG Gauge calculations (Semi-circle or 240deg arc)
  const radius = (size / 2) - 16;
  const circumference = Math.PI * radius; // 180 degree semi circle
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size * 0.65 }}>
        <svg
          width={size}
          height={size * 0.65}
          viewBox={`0 0 ${size} ${size * 0.65}`}
          className="overflow-visible"
        >
          {/* Background Arc */}
          <path
            d={`M 16,${size * 0.6} A ${radius},${radius} 0 0,1 ${size - 16},${size * 0.6}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Active Risk Arc */}
          <path
            d={`M 16,${size * 0.6} A ${radius},${radius} 0 0,1 ${size - 16},${size * 0.6}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Score Readout */}
        <div className="absolute top-8 flex flex-col items-center text-center">
          <span className={`text-4xl font-extrabold tracking-tight ${textColor}`}>
            {normalizedScore}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
            Score / 100
          </span>
        </div>
      </div>

      {showLabels && (
        <div className="mt-1 flex flex-col items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold ${bgColor} ${textColor} border ${borderColor}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: strokeColor }}></span>
            {label}
          </span>

          <div className="flex w-full justify-between gap-4 text-[10px] text-slate-500 font-medium px-2">
            <span>0 (Safe)</span>
            <span>30 (Low)</span>
            <span>70 (Med)</span>
            <span>100 (High)</span>
          </div>
        </div>
      )}
    </div>
  );
};
