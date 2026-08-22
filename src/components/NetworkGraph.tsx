import React, { useState, useRef, useEffect } from 'react';
import { FraudNetworkGraph, GraphNode, GraphEdge } from '../types.ts';
import {
  User,
  Smartphone,
  Globe,
  Wallet,
  Building2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Info
} from 'lucide-react';

interface NetworkGraphProps {
  data: FraudNetworkGraph;
  onSelectNode?: (node: GraphNode) => void;
  selectedNodeId?: string;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  data,
  onSelectNode,
  selectedNodeId,
}) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [onlySuspicious, setOnlySuspicious] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position nodes radially/force-style on a fixed virtual canvas
  const canvasWidth = 900;
  const canvasHeight = 560;

  // Pre-calculate positions
  const nodePositions = React.useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const nodes = data.nodes;

    // Cluster centers
    const clusters: Record<string, { x: number; y: number; r: number }> = {
      USER: { x: 220, y: 280, r: 160 },
      DEVICE: { x: 460, y: 190, r: 120 },
      IP: { x: 700, y: 150, r: 90 },
      BENEFICIARY: { x: 620, y: 380, r: 130 },
      MERCHANT: { x: 280, y: 440, r: 80 },
    };

    // Specific positions for high-impact demo nodes
    const manualCoords: Record<string, { x: number; y: number }> = {
      'user_U102': { x: 240, y: 200 },
      'user_U412': { x: 180, y: 320 },
      'user_U601_COMPROMISED': { x: 160, y: 180 },
      'user_U702_VICTIM': { x: 140, y: 260 },
      'user_U205': { x: 300, y: 120 },
      'user_U309': { x: 180, y: 440 },
      'user_U550': { x: 340, y: 460 },
      'dev_DEV778': { x: 450, y: 220 }, // Center of the compromised cluster
      'dev_DEV102_IPHONE14': { x: 380, y: 110 },
      'dev_DEV205_PIXEL8': { x: 460, y: 90 },
      'ip_103_145_74_19': { x: 680, y: 160 }, // Datacenter VPN IP
      'ip_49_207_210_45': { x: 550, y: 70 },
      'ben_B992': { x: 620, y: 330 }, // Flagged Mule
      'ben_B102_MOM': { x: 400, y: 380 },
      'ben_B201_LANDLORD': { x: 540, y: 460 },
    };

    nodes.forEach((n, idx) => {
      if (manualCoords[n.id]) {
        map.set(n.id, manualCoords[n.id]);
      } else {
        const center = clusters[n.type] || { x: 450, y: 280, r: 150 };
        const angle = (idx / nodes.length) * 2 * Math.PI;
        map.set(n.id, {
          x: center.x + Math.cos(angle) * (center.r + (idx % 3) * 20),
          y: center.y + Math.sin(angle) * (center.r + (idx % 3) * 20),
        });
      }
    });

    return map;
  }, [data.nodes]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    if (onSelectNode) onSelectNode(node);
  };

  const filteredEdges = data.edges.filter(edge => {
    if (onlySuspicious && !edge.is_suspicious) return false;
    return true;
  });

  const filteredNodes = data.nodes.filter(node => {
    if (filterType !== 'ALL' && node.type !== filterType) return false;
    return true;
  });

  const getNodeIcon = (type: GraphNode['type']) => {
    switch (type) {
      case 'USER': return <User className="h-3.5 w-3.5" />;
      case 'DEVICE': return <Smartphone className="h-3.5 w-3.5" />;
      case 'IP': return <Globe className="h-3.5 w-3.5" />;
      case 'BENEFICIARY': return <Wallet className="h-3.5 w-3.5" />;
      case 'MERCHANT': return <Building2 className="h-3.5 w-3.5" />;
    }
  };

  const getNodeColor = (node: GraphNode) => {
    if (node.risk_level === 'CRITICAL') return { fill: '#e11d48', stroke: '#f43f5e', glow: 'rgba(225,29,72,0.4)', text: 'text-rose-400' };
    if (node.risk_level === 'HIGH') return { fill: '#f43f5e', stroke: '#fb7185', glow: 'rgba(244,63,94,0.3)', text: 'text-rose-400' };
    if (node.risk_level === 'MEDIUM') return { fill: '#d97706', stroke: '#fbbf24', glow: 'rgba(217,119,6,0.3)', text: 'text-amber-400' };
    return { fill: '#059669', stroke: '#34d399', glow: 'rgba(5,150,105,0.2)', text: 'text-emerald-400' };
  };

  return (
    <div className="relative flex flex-col rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Filter className="h-4 w-4 text-rose-400" />
            <span>Filter Entities:</span>
          </div>

          <div className="flex items-center gap-1">
            {['ALL', 'USER', 'DEVICE', 'BENEFICIARY', 'IP'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                  filterType === type
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 ml-2">
            <input
              type="checkbox"
              checked={onlySuspicious}
              onChange={(e) => setOnlySuspicious(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-rose-500"
            />
            <span>Highlight Suspicious Clusters Only</span>
          </label>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-mono text-slate-400 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(1.6, z + 0.15))}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Reset View"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative h-[560px] w-full overflow-hidden bg-radial from-slate-900 via-slate-950 to-black" ref={containerRef}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="transition-transform duration-200"
        >
          {/* Defs for gradients & filters */}
          <defs>
            <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f43f5e" floodOpacity="0.6" />
            </filter>
            <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4" />
            </filter>
            <linearGradient id="suspicious-line" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Grid background */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Render Edges */}
          {filteredEdges.map(edge => {
            const p1 = nodePositions.get(edge.source);
            const p2 = nodePositions.get(edge.target);
            if (!p1 || !p2) return null;

            const isHighlighted = edge.is_suspicious;

            return (
              <g key={edge.id}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isHighlighted ? 'url(#suspicious-line)' : '#334155'}
                  strokeWidth={isHighlighted ? 2.5 : 1}
                  strokeDasharray={isHighlighted ? '4,4' : undefined}
                  className={isHighlighted ? 'animate-pulse' : ''}
                />
                {/* Edge relationship tag */}
                {isHighlighted && (
                  <text
                    x={(p1.x + p2.x) / 2}
                    y={(p1.y + p2.y) / 2 - 4}
                    fill="#f43f5e"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {edge.relationship.replace(/_/g, ' ')}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Nodes */}
          {filteredNodes.map(node => {
            const pos = nodePositions.get(node.id) || { x: 200, y: 200 };
            const colors = getNodeColor(node);
            const isSelected = selectedNode?.id === node.id || selectedNodeId === node.id;
            const isCriticalCluster = node.id === 'dev_DEV778' || node.id === 'ben_B992';

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => handleNodeClick(node)}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                {/* Halo for critical / high risk nodes */}
                {isCriticalCluster && (
                  <circle
                    r="28"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                    className="animate-ping"
                  />
                )}

                {/* Node circle */}
                <circle
                  r={isSelected ? 22 : (isCriticalCluster ? 20 : 16)}
                  fill="#0f172a"
                  stroke={colors.stroke}
                  strokeWidth={isSelected ? 3 : 2}
                  filter={node.risk_level === 'CRITICAL' ? 'url(#glow-rose)' : undefined}
                />

                {/* Inner dot with risk indicator */}
                <circle
                  r="5"
                  fill={colors.fill}
                />

                {/* Node Label */}
                <text
                  y="26"
                  fill="#cbd5e1"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  className="select-none pointer-events-none drop-shadow"
                >
                  {node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label}
                </text>

                <text
                  y="36"
                  fill="#64748b"
                  fontSize="8"
                  textAnchor="middle"
                  className="select-none pointer-events-none uppercase font-bold"
                >
                  {node.type}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Mule Syndicate Warning Overlay Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-rose-950/80 border border-rose-800/80 px-3 py-2 text-xs backdrop-blur-md">
          <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse" />
          <div>
            <span className="font-bold text-rose-300">Coordinated Mule Ring Detected</span>
            <p className="text-[11px] text-rose-400/80">3 Victim Accounts connected to Emulator DEV778 and Beneficiary B992</p>
          </div>
        </div>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute right-4 top-4 w-80 rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="rounded p-1.5 bg-slate-800 text-slate-300">
                  {getNodeIcon(selectedNode.type)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{selectedNode.label}</h4>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">{selectedNode.type}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Risk Assessment</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  selectedNode.risk_level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  selectedNode.risk_level === 'HIGH' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' :
                  selectedNode.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {selectedNode.risk_level}
                </span>
              </div>

              {Object.entries(selectedNode.properties).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center py-0.5">
                  <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-mono text-slate-200">{String(val)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-2 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => alert(`Node ${selectedNode.id} added to forensic investigation docket.`)}
                className="w-full rounded bg-rose-600 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Flag for Review
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
