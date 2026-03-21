import type { FEASolverInput } from '../types/fea';

export interface SolveResponse {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  estimated_duration_seconds?: number;
  _links?: {
    self: string;
    result: string;
  };
}

export interface SolveResult {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  completed_at?: string;
  computation_time_seconds?: number;
  displacements?: Record<string, number[]>;
  stresses?: Record<string, number[]>;
  reactions?: Record<string, number[]>;
  max_displacement?: number;
  warnings?: string[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';

export async function submitSolve(input: FEASolverInput): Promise<SolveResponse> {
  const response = await fetch(`${API_BASE}/solver/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Solve request failed: ${response.status}`);
  }

  return response.json() as Promise<SolveResponse>;
}

export async function fetchSolveResult(jobId: string): Promise<SolveResult> {
  const response = await fetch(`${API_BASE}/solver/jobs/${jobId}/result`);

  if (!response.ok) {
    throw new Error(`Result request failed: ${response.status}`);
  }

  return response.json() as Promise<SolveResult>;
}
