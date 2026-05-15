import type { FEASolverInput } from '../types/fea';

export interface SolveResult {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  computation_time_seconds?: number;
  displacements: Record<string, number[]>;
  stresses?: Record<string, number[]>;
  reactions?: Record<string, number[]>;
  max_displacement?: number;
  nodes?: number[][];
  elements?: number[][];
  warnings?: string[];
}

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';

function getErrorMessage(status: number, detail?: string): string {
  if (detail) return detail;
  switch (status) {
    case 400:
      return 'Invalid input data. Please check your parameters and try again.';
    case 404:
      return 'Solver endpoint not found. Please verify the backend is running.';
    case 500:
      return 'Server error occurred during computation. Please try again later.';
    case 503:
      return 'Solver service is temporarily unavailable. Please try again later.';
    default:
      return `Request failed with status ${status}. Please check your network connection.`;
  }
}

export async function submitSolve(input: FEASolverInput): Promise<SolveResult> {
  const payload = {
    geometry: {
      ...input.geometry,
      bcType: input.geometry.bcType ?? 'FIXED',
    },
    mesh: input.mesh,
    physical: {
      ...input.physical,
      planeState: input.physical.planeState ?? 'PLANE_STRESS',
    },
    loads: input.loads,
    scaleFactor: input.scaleFactor,
  };

  console.log('API request payload:', payload);
  
  const response = await fetch(`${API_BASE}/solver/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  console.log('API response status:', response.status);
  
  if (!response.ok) {
    let detail: string | undefined;
    try {
      const errorBody = await response.json();
      detail = errorBody.detail;
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiError(
      getErrorMessage(response.status, detail),
      response.status,
      detail
    );
  }

  const data = await response.json();
  console.log('API response data:', data);
  return data as SolveResult;
}

export async function fetchSolveResult(_jobId: string): Promise<SolveResult> {
  // For synchronous solver, results are returned immediately.
  // This stub is kept for future async job queue support.
  throw new ApiError('Async result fetching is not yet implemented. Results are returned synchronously.', 501);
}
