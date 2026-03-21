// PSLG (Planar Straight Line Graph) Validation Utilities
// These functions prevent invalid configurations that would cause mesh/solver failures

import { GeometryParams, MeshConfig, PhysicalProperties, LoadParams, ValidationResult, ValidationError } from '../types/fea';

// Constants for FEA constraints
const CONSTRAINTS = {
  MIN_GEOMETRY_DIMENSION: 1e-10,  // Minimum geometry dimension (prevents zero/negative)
  MAX_GEOMETRY_DIMENSION: 1e6,    // Maximum reasonable dimension
  MIN_MESH_DIVISIONS: 1,           // Minimum mesh elements per direction
  MAX_MESH_DIVISIONS: 10000,       // Maximum mesh elements (performance limit)
  MIN_YOUNGS_MODULUS: 1e-100,      // Minimum Young's modulus
  MAX_YOUNGS_MODULUS: 1e15,        // Maximum realistic Young's modulus (Pa)
  MIN_POISSONS_RATIO: 0,           // Minimum Poisson's ratio
  MAX_POISSONS_RATIO: 0.4999,      // Maximum Poisson's ratio (< 0.5 for stability)
  MIN_LOAD: -1e12,                 // Minimum load value
  MAX_LOAD: 1e12,                 // Maximum load value
  MIN_SCALE_FACTOR: 0.001,         // Minimum scale factor for visualization
  MAX_SCALE_FACTOR: 10000,         // Maximum scale factor
  ASPECT_RATIO_WARNING: 100,       // Aspect ratio threshold for warning
};

/**
 * Validates geometry parameters for PSLG compliance
 * Prevents: zero/negative dimensions, invalid element types, extreme aspect ratios
 */
export function validateGeometry(params: GeometryParams): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate d1 (length in x)
  if (params.d1 === null || params.d1 === undefined || isNaN(params.d1)) {
    errors.push({
      field: 'geometry.d1',
      message: 'Length d1 is required and must be a number',
      code: 'GEOM_D1_REQUIRED',
    });
  } else if (params.d1 <= CONSTRAINTS.MIN_GEOMETRY_DIMENSION) {
    errors.push({
      field: 'geometry.d1',
      message: `Length d1 must be greater than ${CONSTRAINTS.MIN_GEOMETRY_DIMENSION}`,
      code: 'GEOM_D1_TOO_SMALL',
    });
  } else if (params.d1 > CONSTRAINTS.MAX_GEOMETRY_DIMENSION) {
    errors.push({
      field: 'geometry.d1',
      message: `Length d1 must be less than ${CONSTRAINTS.MAX_GEOMETRY_DIMENSION}`,
      code: 'GEOM_D1_TOO_LARGE',
    });
  }

  // Validate d2 (length in y)
  if (params.d2 === null || params.d2 === undefined || isNaN(params.d2)) {
    errors.push({
      field: 'geometry.d2',
      message: 'Height d2 is required and must be a number',
      code: 'GEOM_D2_REQUIRED',
    });
  } else if (params.d2 <= CONSTRAINTS.MIN_GEOMETRY_DIMENSION) {
    errors.push({
      field: 'geometry.d2',
      message: `Height d2 must be greater than ${CONSTRAINTS.MIN_GEOMETRY_DIMENSION}`,
      code: 'GEOM_D2_TOO_SMALL',
    });
  } else if (params.d2 > CONSTRAINTS.MAX_GEOMETRY_DIMENSION) {
    errors.push({
      field: 'geometry.d2',
      message: `Height d2 must be less than ${CONSTRAINTS.MAX_GEOMETRY_DIMENSION}`,
      code: 'GEOM_D2_TOO_LARGE',
    });
  }

  // Validate element type
  if (!params.elementType) {
    errors.push({
      field: 'geometry.elementType',
      message: 'Element type is required',
      code: 'GEOM_ELEMENT_TYPE_REQUIRED',
    });
  } else if (!['D2QU4N', 'D2TR3N'].includes(params.elementType)) {
    errors.push({
      field: 'geometry.elementType',
      message: 'Element type must be D2QU4N (4-node quad) or D2TR3N (3-node triangle)',
      code: 'GEOM_ELEMENT_TYPE_INVALID',
    });
  }

  // Check aspect ratio for PSLG validity
  if (params.d1 && params.d2 && 
      params.d1 > CONSTRAINTS.MIN_GEOMETRY_DIMENSION && 
      params.d2 > CONSTRAINTS.MIN_GEOMETRY_DIMENSION) {
    const aspectRatio = Math.max(params.d1, params.d2) / Math.min(params.d1, params.d2);
    if (aspectRatio > CONSTRAINTS.ASPECT_RATIO_WARNING) {
      // This is a warning, not an error - mesh will still work but may have accuracy issues
      console.warn(`High aspect ratio detected: ${aspectRatio.toFixed(2)}. Consider adjusting dimensions.`);
    }
  }

  return errors;
}

/**
 * Validates mesh configuration
 * Prevents: invalid element counts, memory issues, degenerate meshes
 */
export function validateMesh(config: MeshConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate p (elements in x)
  if (config.p === null || config.p === undefined || isNaN(config.p)) {
    errors.push({
      field: 'mesh.p',
      message: 'Element count p in x-direction is required',
      code: 'MESH_P_REQUIRED',
    });
  } else if (!Number.isInteger(config.p)) {
    errors.push({
      field: 'mesh.p',
      message: 'Element count p must be an integer',
      code: 'MESH_P_NOT_INTEGER',
    });
  } else if (config.p < CONSTRAINTS.MIN_MESH_DIVISIONS) {
    errors.push({
      field: 'mesh.p',
      message: `Element count p must be at least ${CONSTRAINTS.MIN_MESH_DIVISIONS}`,
      code: 'MESH_P_TOO_SMALL',
    });
  } else if (config.p > CONSTRAINTS.MAX_MESH_DIVISIONS) {
    errors.push({
      field: 'mesh.p',
      message: `Element count p must not exceed ${CONSTRAINTS.MAX_MESH_DIVISIONS} (performance limit)`,
      code: 'MESH_P_TOO_LARGE',
    });
  }

  // Validate m (elements in y)
  if (config.m === null || config.m === undefined || isNaN(config.m)) {
    errors.push({
      field: 'mesh.m',
      message: 'Element count m in y-direction is required',
      code: 'MESH_M_REQUIRED',
    });
  } else if (!Number.isInteger(config.m)) {
    errors.push({
      field: 'mesh.m',
      message: 'Element count m must be an integer',
      code: 'MESH_M_NOT_INTEGER',
    });
  } else if (config.m < CONSTRAINTS.MIN_MESH_DIVISIONS) {
    errors.push({
      field: 'mesh.m',
      message: `Element count m must be at least ${CONSTRAINTS.MIN_MESH_DIVISIONS}`,
      code: 'MESH_M_TOO_SMALL',
    });
  } else if (config.m > CONSTRAINTS.MAX_MESH_DIVISIONS) {
    errors.push({
      field: 'mesh.m',
      message: `Element count m must not exceed ${CONSTRAINTS.MAX_MESH_DIVISIONS} (performance limit)`,
      code: 'MESH_M_TOO_LARGE',
    });
  }

  return errors;
}

/**
 * Validates physical properties
 * Prevents: negative stiffness, unstable materials (nu >= 0.5)
 */
export function validatePhysicalProperties(props: PhysicalProperties): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate Young's modulus (E)
  if (props.E === null || props.E === undefined || isNaN(props.E)) {
    errors.push({
      field: 'physical.E',
      message: "Young's modulus E is required",
      code: 'PHYS_E_REQUIRED',
    });
  } else if (props.E <= 0) {
    errors.push({
      field: 'physical.E',
      message: "Young's modulus E must be positive",
      code: 'PHYS_E_NON_POSITIVE',
    });
  } else if (props.E < CONSTRAINTS.MIN_YOUNGS_MODULUS) {
    errors.push({
      field: 'physical.E',
      message: `Young's modulus E is unreasonably small`,
      code: 'PHYS_E_TOO_SMALL',
    });
  } else if (props.E > CONSTRAINTS.MAX_YOUNGS_MODULUS) {
    errors.push({
      field: 'physical.E',
      message: `Young's modulus E exceeds reasonable material limits`,
      code: 'PHYS_E_TOO_LARGE',
    });
  }

  // Validate Poisson's ratio (nu) - critical for stability
  if (props.nu === null || props.nu === undefined || isNaN(props.nu)) {
    errors.push({
      field: 'physical.nu',
      message: "Poisson's ratio ν is required",
      code: 'PHYS_NU_REQUIRED',
    });
  } else if (props.nu < CONSTRAINTS.MIN_POISSONS_RATIO) {
    errors.push({
      field: 'physical.nu',
      message: `Poisson's ratio ν must be at least ${CONSTRAINTS.MIN_POISSONS_RATIO}`,
      code: 'PHYS_NU_NEGATIVE',
    });
  } else if (props.nu >= 0.5) {
    errors.push({
      field: 'physical.nu',
      message: "Poisson's ratio ν must be less than 0.5 for material stability (incompressibility constraint)",
      code: 'PHYS_NU_UNSTABLE',
    });
  } else if (props.nu > CONSTRAINTS.MAX_POISSONS_RATIO) {
    errors.push({
      field: 'physical.nu',
      message: `Poisson's ratio ν should be less than ${CONSTRAINTS.MAX_POISSONS_RATIO} for numerical stability`,
      code: 'PHYS_NU_WARNING',
    });
  }

  return errors;
}

/**
 * Validates load parameters
 * Prevents: extreme loads that could cause numerical instability
 */
export function validateLoads(loads: LoadParams): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate load value
  if (loads.loadVal === null || loads.loadVal === undefined || isNaN(loads.loadVal)) {
    errors.push({
      field: 'loads.loadVal',
      message: 'Load value is required',
      code: 'LOAD_VALUE_REQUIRED',
    });
  } else if (loads.loadVal < CONSTRAINTS.MIN_LOAD) {
    errors.push({
      field: 'loads.loadVal',
      message: `Load value is unreasonably large in compression`,
      code: 'LOAD_TOO_NEGATIVE',
    });
  } else if (loads.loadVal > CONSTRAINTS.MAX_LOAD) {
    errors.push({
      field: 'loads.loadVal',
      message: `Load value exceeds maximum allowed`,
      code: 'LOAD_TOO_LARGE',
    });
  }

  // Validate load direction
  if (!loads.loadDirection) {
    errors.push({
      field: 'loads.loadDirection',
      message: 'Load direction is required',
      code: 'LOAD_DIR_REQUIRED',
    });
  } else if (!['x', 'y'].includes(loads.loadDirection)) {
    errors.push({
      field: 'loads.loadDirection',
      message: 'Load direction must be x or y',
      code: 'LOAD_DIR_INVALID',
    });
  }

  return errors;
}

/**
 * Validates scale factor for visualization
 */
export function validateScaleFactor(scale: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (scale === null || scale === undefined || isNaN(scale)) {
    errors.push({
      field: 'scaleFactor',
      message: 'Scale factor is required',
      code: 'SCALE_REQUIRED',
    });
  } else if (scale <= 0) {
    errors.push({
      field: 'scaleFactor',
      message: 'Scale factor must be positive for visualization',
      code: 'SCALE_NON_POSITIVE',
    });
  } else if (scale < CONSTRAINTS.MIN_SCALE_FACTOR) {
    errors.push({
      field: 'scaleFactor',
      message: `Scale factor is too small (min: ${CONSTRAINTS.MIN_SCALE_FACTOR})`,
      code: 'SCALE_TOO_SMALL',
    });
  } else if (scale > CONSTRAINTS.MAX_SCALE_FACTOR) {
    errors.push({
      field: 'scaleFactor',
      message: `Scale factor is too large (max: ${CONSTRAINTS.MAX_SCALE_FACTOR})`,
      code: 'SCALE_TOO_LARGE',
    });
  }

  return errors;
}

/**
 * Comprehensive validation for complete FEA solver input
 */
export function validateFEASolverInput(input: {
  geometry: GeometryParams;
  mesh: MeshConfig;
  physical: PhysicalProperties;
  loads: LoadParams;
  scaleFactor: number;
}): ValidationResult {
  const allErrors: ValidationError[] = [
    ...validateGeometry(input.geometry),
    ...validateMesh(input.mesh),
    ...validatePhysicalProperties(input.physical),
    ...validateLoads(input.loads),
    ...validateScaleFactor(input.scaleFactor),
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Real-time field validation helper
 * Returns error message for a single field
 */
export function getFieldError(
  field: string,
  value: unknown,
  fieldType: 'geometry' | 'mesh' | 'physical' | 'loads' | 'scale'
): string | null {
  switch (fieldType) {
    case 'geometry': {
      const geom = value as GeometryParams;
      const errors = validateGeometry(geom);
      return errors.find(e => e.field.includes(field.split('.')[1] || field))?.message || null;
    }
    case 'mesh': {
      const mesh = value as MeshConfig;
      const errors = validateMesh(mesh);
      return errors.find(e => e.field.includes(field.split('.')[1] || field))?.message || null;
    }
    case 'physical': {
      const phys = value as PhysicalProperties;
      const errors = validatePhysicalProperties(phys);
      return errors.find(e => e.field.includes(field.split('.')[1] || field))?.message || null;
    }
    case 'loads': {
      const loads = value as LoadParams;
      const errors = validateLoads(loads);
      return errors.find(e => e.field.includes(field.split('.')[1] || field))?.message || null;
    }
    case 'scale':
      return validateScaleFactor(value as number).find(() => true)?.message || null;
    default:
      return null;
  }
}
