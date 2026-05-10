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

// Mesh Annotation Types for Visualization

/** Represents a fixed support constraint on a node */
export interface FixedSupport {
  nodeIndex: number;
  type: 'fixed';
  /** Direction of constraint: 'x' | 'y' | 'both' */
  direction: 'x' | 'y' | 'both';
}

/** Represents a point load applied to a node */
export interface PointLoad {
  nodeIndex: number;
  type: 'load';
  /** Load magnitude in Newtons */
  magnitude: number;
  /** Load direction: 'x' | 'y' | angle in degrees */
  direction: 'x' | 'y' | number;
}

/** Union type for all mesh annotation types */
export type MeshAnnotation = FixedSupport | PointLoad;
