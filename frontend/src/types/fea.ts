// FEA Solver Types and Interfaces

export interface GeometryParams {
  d1: number; // Length in x direction
  d2: number; // Height in y direction
  elementType: 'D2QU4N' | 'D2TR3N';
}

export interface MeshConfig {
  p: number; // Elements in x direction
  m: number; // Elements in y direction
}

export interface PhysicalProperties {
  E: number;  // Young's modulus (Pa)
  nu: number; // Poisson's ratio (dimensionless)
}

export interface LoadParams {
  loadVal: number; // Total traction load (N/m)
  loadDirection: 'x' | 'y';
}

export interface FEASolverInput {
  geometry: GeometryParams;
  mesh: MeshConfig;
  physical: PhysicalProperties;
  loads: LoadParams;
  scaleFactor: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
