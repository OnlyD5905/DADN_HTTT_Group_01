import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MeshVisualization } from '../components/MeshVisualization';
import { generateQuadMesh } from '../utils/meshGenerator';
import type { Mesh } from '../utils/meshGenerator';
import type { MeshAnnotation, GeometryParams, MeshConfig, LoadParams } from '../types/fea';

type MatrixPage = 'displacements' | 'stresses' | 'reactions';
type HeatmapMode = 'none' | 'displacement' | 'stress';

interface ResultsState {
  jobId?: string;
  status?: string;
  computationTimeSeconds?: number;
  maxDisplacement?: number;
  warnings?: string[];
  displacements?: Record<string, number[]>;
  stresses?: Record<string, number[]>;
  reactions?: Record<string, number[]>;
  nodes?: number[][];
  elements?: number[][];
  geometry?: GeometryParams;
  mesh?: MeshConfig;
  loads?: LoadParams;
  scaleFactor?: number;
}

const pageSize = 6;

/** Convert quad elements to unique edges for visualization */
function elementsToEdges(elements: number[][]): [number, number][] {
  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];

  for (const el of elements) {
    // Quad edges: 0-1, 1-2, 2-3, 3-0
    const nodePairs: [number, number][] = [
      [el[0], el[1]],
      [el[1], el[2]],
      [el[2], el[3]],
      [el[3], el[0]],
    ];
    for (const [a, b] of nodePairs) {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([a, b]);
      }
    }
  }
  return edges;
}

/** Build annotations from geometry and mesh config */
function buildAnnotations(
  geometry: GeometryParams | undefined,
  meshCfg: MeshConfig | undefined,
  loadVal: number,
  loadDir: string
): MeshAnnotation[] {
  if (!geometry || !meshCfg) return [];
  const annotations: MeshAnnotation[] = [];
  const p = meshCfg.p;
  const m = meshCfg.m;

  // Fixed supports on left edge (x = 0)
  for (let j = 0; j <= m; j++) {
    const nodeIdx = j * (p + 1);
    annotations.push({ nodeIndex: nodeIdx, type: 'fixed', direction: 'both' });
  }

  // Point loads on right edge (x = d1)
  const numLoadNodes = m + 1;
  const loadPerNode = loadVal / numLoadNodes;
  for (let j = 0; j <= m; j++) {
    const nodeIdx = j * (p + 1) + p;
    annotations.push({
      nodeIndex: nodeIdx,
      type: 'load',
      magnitude: loadPerNode,
      direction: loadDir as 'x' | 'y',
    });
  }

  return annotations;
}

/** Compute displacement magnitude per node */
function computeDisplacementMagnitudes(
  displacements: Record<string, number[]> | undefined,
  nodeCount: number
): number[] {
  if (!displacements) return new Array(nodeCount).fill(0);
  const magnitudes = new Array(nodeCount).fill(0);
  for (let i = 0; i < nodeCount; i++) {
    const d = displacements[String(i)];
    if (d && d.length >= 2) {
      magnitudes[i] = Math.sqrt(d[0] * d[0] + d[1] * d[1]);
    }
  }
  return magnitudes;
}

/** Compute von Mises stress per element, averaged to nodes */
function computeNodalStresses(
  stresses: Record<string, number[]> | undefined,
  nodeCount: number,
  elements: number[][] | undefined
): number[] {
  if (!stresses || !elements) return new Array(nodeCount).fill(0);

  const nodalSums = new Array(nodeCount).fill(0);
  const nodalCounts = new Array(nodeCount).fill(0);

  for (let e = 0; e < elements.length; e++) {
    const s = stresses[String(e)];
    if (!s || s.length < 3) continue;
    const sx = s[0];
    const sy = s[1];
    const txy = s[2];
    // von Mises stress for plane stress
    const vm = Math.sqrt(sx * sx + sy * sy - sx * sy + 3 * txy * txy);

    for (const nodeIdx of elements[e]) {
      nodalSums[nodeIdx] += vm;
      nodalCounts[nodeIdx] += 1;
    }
  }

  return nodalSums.map((sum, i) => (nodalCounts[i] > 0 ? sum / nodalCounts[i] : 0));
}

function Results() {
  const location = useLocation();
  const state = (location.state ?? {}) as ResultsState;
  
  // Debug logging
  console.log('Results page state:', state);
  console.log('Has displacements:', !!state.displacements);
  console.log('Displacements keys:', state.displacements ? Object.keys(state.displacements).length : 0);
  const [matrixPage, setMatrixPage] = useState<MatrixPage>('displacements');
  const [pageIndex, setPageIndex] = useState(0);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('displacement');

  // Build mesh from backend data or fallback to mock
  const mesh: Mesh = useMemo(() => {
    if (state.nodes && state.elements && state.nodes.length > 0 && state.elements.length > 0) {
      const nodes = state.nodes.map((n) => [n[0], n[1]] as [number, number]);
      const edges = elementsToEdges(state.elements);
      return { nodes, edges };
    }
    // Fallback mock mesh
    return generateQuadMesh(
      state.mesh?.p ?? 4,
      state.mesh?.m ?? 4,
      state.geometry?.d1 ?? 1,
      state.geometry?.d2 ?? 1
    );
  }, [state.nodes, state.elements, state.geometry, state.mesh]);

  const annotations = useMemo(() => {
    return buildAnnotations(
      state.geometry,
      state.mesh,
      state.loads?.loadVal ?? (state.geometry?.d1 ? state.geometry.d1 * 10000 : 10000),
      state.loads?.loadDirection ?? 'x'
    );
  }, [state.geometry, state.mesh, state.loads]);

  // Compute scalar values for heatmap
  const nodeValues = useMemo(() => {
    const nodeCount = mesh.nodes.length;
    if (heatmapMode === 'displacement') {
      return computeDisplacementMagnitudes(state.displacements, nodeCount);
    }
    if (heatmapMode === 'stress') {
      return computeNodalStresses(state.stresses, nodeCount, state.elements);
    }
    return undefined;
  }, [heatmapMode, state.displacements, state.stresses, mesh.nodes.length, state.elements]);

  const heatmapLabel = useMemo(() => {
    if (heatmapMode === 'displacement') return 'Displacement Magnitude (m)';
    if (heatmapMode === 'stress') return 'Von Mises Stress (Pa)';
    return undefined;
  }, [heatmapMode]);

  const data = useMemo(() => {
    const maps: Record<MatrixPage, Record<string, number[]>> = {
      displacements: state.displacements ?? {},
      stresses: state.stresses ?? {},
      reactions: state.reactions ?? {},
    };
    const entries = Object.entries(maps[matrixPage]);
    const start = pageIndex * pageSize;
    const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
    return { entries: entries.slice(start, start + pageSize), totalPages };
  }, [matrixPage, pageIndex, state.displacements, state.stresses, state.reactions]);

  const hasRealData = !!state.displacements && Object.keys(state.displacements).length > 0;

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header stats */}
        <div className="rounded-3xl bg-white border border-black/5 shadow-[0_20px_60px_rgba(3,3,145,0.12)] p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-[#1A1A1A]/60">FEA Solve Result</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">Analysis Results</h1>
            </div>
            <Link to="/solver" className="text-sm font-semibold text-[#1488D8] hover:text-[#030391]">Back to solver</Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#1488D8]/15 p-4">
              <p className="text-xs text-[#1A1A1A]/55">Job ID</p>
              <p className="mt-1 text-sm font-semibold text-[#1A1A1A] truncate">{state.jobId ?? '—'}</p>
            </div>
            <div className="rounded-2xl border border-[#1488D8]/15 p-4">
              <p className="text-xs text-[#1A1A1A]/55">Status</p>
              <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${state.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : state.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${state.status === 'completed' ? 'bg-emerald-500' : state.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  {state.status ?? '—'}
                </span>
              </p>
            </div>
            <div className="rounded-2xl border border-[#1488D8]/15 p-4">
              <p className="text-xs text-[#1A1A1A]/55">Compute Time</p>
              <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">{state.computationTimeSeconds?.toFixed(3) ?? '—'} s</p>
            </div>
            <div className="rounded-2xl border border-[#1488D8]/15 p-4">
              <p className="text-xs text-[#1A1A1A]/55">Max Displacement</p>
              <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">{state.maxDisplacement?.toExponential(3) ?? '—'}</p>
            </div>
          </div>

          {!!state.warnings?.length && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {state.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          )}

          {!hasRealData && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p className="font-medium">No computation data available</p>
                <p className="text-amber-700/80 mt-0.5">This page is showing default mesh data because no solver results were found. Please run the solver from the configuration page.</p>
              </div>
            </div>
          )}
        </div>

        {/* Mesh Visualization Section */}
        <div className="rounded-3xl bg-white border border-black/5 shadow-[0_20px_60px_rgba(3,3,145,0.12)] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-[#1A1A1A]/60">Mesh Visualization</p>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">FEA Mesh</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['none', 'displacement', 'stress'] as HeatmapMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setHeatmapMode(mode)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${heatmapMode === mode ? 'bg-[#1488D8] text-white border-[#1488D8]' : 'bg-white text-[#1A1A1A] border-[#1488D8]/20 hover:border-[#1488D8]/40'}`}
                >
                  {mode === 'none' ? 'Mesh Only' : mode === 'displacement' ? 'Displacement' : 'Stress'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-96 rounded-2xl border border-[#1488D8]/15 overflow-hidden">
            <MeshVisualization
              mesh={mesh}
              elements={state.elements}
              annotations={annotations}
              nodeValues={nodeValues}
              showHeatmap={heatmapMode !== 'none'}
              heatmapLabel={heatmapLabel}
            />
          </div>
          {/* Annotation Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#1A1A1A]/70">
            <div className="flex items-center gap-2">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-red-500"></div>
              <span>Fixed Support (ngàm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-600"></div>
              <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-blue-600"></div>
              <span>Point Load (lực)</span>
            </div>
            {heatmapMode !== 'none' && nodeValues && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#1A1A1A]/50">{heatmapLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* Data Tables */}
        <div className="rounded-3xl bg-white border border-black/5 shadow-[0_20px_60px_rgba(3,3,145,0.12)] p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            {(['displacements', 'stresses', 'reactions'] as MatrixPage[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => { setMatrixPage(key); setPageIndex(0); }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${matrixPage === key ? 'bg-[#1488D8] text-white' : 'bg-[#F5F7FA] text-[#1A1A1A] hover:bg-[#1488D8]/10'}`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[#1488D8]/15">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F5F7FA] text-[#1A1A1A]">
                <tr>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Values</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.length ? data.entries.map(([label, values]) => (
                  <tr key={label} className="border-t border-[#1488D8]/10">
                    <td className="px-4 py-3 font-medium text-[#1A1A1A]">{label}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]/80 font-mono text-xs">{values.map((v) => v.toExponential(4)).join(', ')}</td>
                  </tr>
                )) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-[#1A1A1A]/55" colSpan={2}>No result data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPageIndex((v) => Math.max(0, v - 1))}
              className="rounded-xl border border-[#1488D8]/15 px-4 py-2 text-sm font-semibold text-[#1A1A1A] disabled:opacity-40"
              disabled={pageIndex === 0}
            >
              Prev
            </button>
            <span className="text-sm text-[#1A1A1A]/60">Page {pageIndex + 1} / {data.totalPages}</span>
            <button
              type="button"
              onClick={() => setPageIndex((v) => v + 1)}
              className="rounded-xl border border-[#1488D8]/15 px-4 py-2 text-sm font-semibold text-[#1A1A1A] disabled:opacity-40"
              disabled={pageIndex + 1 >= data.totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Results;
