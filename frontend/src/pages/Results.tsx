import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MeshVisualization } from '../components/MeshVisualization';

type MatrixPage = 'displacements' | 'stresses' | 'reactions';

interface ResultsState {
  jobId?: string;
  status?: string;
  computationTimeSeconds?: number;
  maxDisplacement?: number;
  warnings?: string[];
  displacements?: Record<string, number[]>;
  stresses?: Record<string, number[]>;
  reactions?: Record<string, number[]>;
}

const pageSize = 6;

function Results() {
  const location = useLocation();
  const state = (location.state ?? {}) as ResultsState;
  const [matrixPage, setMatrixPage] = useState<MatrixPage>('displacements');
  const [pageIndex, setPageIndex] = useState(0);

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

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
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
              <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">{state.jobId ?? '—'}</p>
            </div>
            <div className="rounded-2xl border border-[#1488D8]/15 p-4">
              <p className="text-xs text-[#1A1A1A]/55">Status</p>
              <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">{state.status ?? '—'}</p>
            </div>
            <div className="rounded-2xl border border-[#1488D8]/15 p-4">
              <p className="text-xs text-[#1A1A1A]/55">Compute Time</p>
              <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">{state.computationTimeSeconds?.toFixed(2) ?? '—'} s</p>
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
        </div>

        {/* Mesh Visualization Section */}
        <div className="rounded-3xl bg-white border border-black/5 shadow-[0_20px_60px_rgba(3,3,145,0.12)] p-6 sm:p-8">
          <div className="mb-4">
            <p className="text-sm text-[#1A1A1A]/60">Mesh Visualization</p>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">FEA Mesh</h2>
          </div>
          <div className="h-96 rounded-2xl border border-[#1488D8]/15 overflow-hidden">
            <MeshVisualization />
          </div>
        </div>

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
                    <td className="px-4 py-3 text-[#1A1A1A]/80">{values.map((v) => v.toFixed(4)).join(', ')}</td>
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
