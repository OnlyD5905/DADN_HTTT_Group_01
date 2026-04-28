import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  LogOut, 
  Play, 
  RefreshCw, 
  Square, 
  Triangle, 
  Zap 
} from 'lucide-react';
import { 
  validateGeometry, 
  validateMesh, 
  validatePhysicalProperties, 
  validateLoads, 
  validateScaleFactor 
} from '../utils/validation';
import type { GeometryParams, MeshConfig, PhysicalProperties, LoadParams, ValidationError } from '../types/fea';
import { submitSolve } from '../services/solverApi';

const hcmutLogo = new URL('../../logo/01_logobachkhoatoi.png', import.meta.url).href;

interface SectionErrors {
  geometry: ValidationError[];
  mesh: ValidationError[];
  physical: ValidationError[];
  loads: ValidationError[];
  scale: ValidationError[];
}

interface FormState {
  geometry: GeometryParams;
  mesh: MeshConfig;
  physical: PhysicalProperties;
  loads: LoadParams;
  scaleFactor: number;
}

function FEASolver() {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState({
    geometry: false,
    mesh: false,
    physical: false,
    loads: false,
    scale: false,
  });
  const [errors, setErrors] = useState<SectionErrors>({
    geometry: [],
    mesh: [],
    physical: [],
    loads: [],
    scale: [],
  });
  const [isSolving, setIsSolving] = useState(false);
  const [solveResult, setSolveResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState<FormState>({
    geometry: {
      d1: 1.0,
      d2: 1.0,
      elementType: 'D2QU4N',
    },
    mesh: {
      p: 4,
      m: 4,
    },
    physical: {
      E: 210e9, // 210 GPa (Steel)
      nu: 0.3,
    },
    loads: {
      loadVal: 10000,
      loadDirection: 'x',
    },
    scaleFactor: 100,
  });

  // Calculate element size for info display
  const elementSizeX = formData.geometry.d1 / formData.mesh.p;
  const elementSizeY = formData.geometry.d2 / formData.mesh.m;
  const totalElements = formData.mesh.p * formData.mesh.m;
  const totalNodes = (formData.mesh.p + 1) * (formData.mesh.m + 1);

  // Real-time validation on field change
  const validateField = (section: keyof SectionErrors, name: string, value: string | number) => {
    let newErrors: ValidationError[] = [];

    switch (section) {
      case 'geometry': {
        const geomData = { ...formData.geometry, [name]: value };
        newErrors = validateGeometry(geomData as GeometryParams);
        break;
      }
      case 'mesh': {
        const meshData = { ...formData.mesh, [name]: typeof value === 'string' ? parseInt(value) || 0 : value };
        newErrors = validateMesh(meshData as MeshConfig);
        break;
      }
      case 'physical': {
        const physData = { ...formData.physical, [name]: typeof value === 'string' ? parseFloat(value) : value };
        newErrors = validatePhysicalProperties(physData as PhysicalProperties);
        break;
      }
      case 'loads': {
        const loadData = { ...formData.loads, [name]: value };
        newErrors = validateLoads(loadData as LoadParams);
        break;
      }
      case 'scale': {
        newErrors = validateScaleFactor(typeof value === 'string' ? parseFloat(value) : value);
        break;
      }
    }

    setErrors((prev) => ({ ...prev, [section]: newErrors }));
  };

  // Handle input changes
  const handleChange = (
    section: 'geometry' | 'mesh' | 'physical' | 'loads' | 'scaleFactor',
    field: string,
    value: string | number
  ) => {
    if (section === 'scaleFactor') {
      // scaleFactor is a direct number property
      // Only update if value is a valid number or empty string
      if (value === '' || (typeof value === 'number' && !isNaN(value))) {
        setFormData((prev) => ({
          ...prev,
          scaleFactor: value === '' ? prev.scaleFactor : value,
        }));
      }
    } else {
      // Nested objects: geometry, mesh, physical, loads
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    }
    
    // Clear solve result when form changes
    if (solveResult) {
      setSolveResult(null);
    }
  };

  // Handle blur for validation
  const handleBlur = (
    section: keyof SectionErrors,
    field: string,
    value: string | number
  ) => {
    validateField(section, field, value);
  };

  // Toggle section collapse
  const toggleSection = (section: keyof typeof isCollapsed) => {
    setIsCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Count errors for a section
  const getSectionErrorCount = (section: keyof SectionErrors) => {
    return errors[section].length;
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      errors.geometry.length === 0 &&
      errors.mesh.length === 0 &&
      errors.physical.length === 0 &&
      errors.loads.length === 0 &&
      errors.scale.length === 0 &&
      formData.geometry.d1 > 0 &&
      formData.geometry.d2 > 0 &&
      formData.mesh.p >= 1 &&
      formData.mesh.m >= 1 &&
      formData.physical.E > 0 &&
      formData.physical.nu >= 0 &&
      formData.physical.nu < 0.5
    );
  };

  // Reset form to defaults
  const handleReset = () => {
    setFormData({
      geometry: { d1: 1.0, d2: 1.0, elementType: 'D2QU4N' },
      mesh: { p: 4, m: 4 },
      physical: { E: 210e9, nu: 0.3 },
      loads: { loadVal: 10000, loadDirection: 'x' },
      scaleFactor: 100,
    });
    setErrors({
      geometry: [],
      mesh: [],
      physical: [],
      loads: [],
      scale: [],
    });
    setSolveResult(null);
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Final validation
    const allErrors: SectionErrors = {
      geometry: validateGeometry(formData.geometry),
      mesh: validateMesh(formData.mesh),
      physical: validatePhysicalProperties(formData.physical),
      loads: validateLoads(formData.loads),
      scale: validateScaleFactor(formData.scaleFactor),
    };

    setErrors(allErrors);

    if (!isFormValid()) {
      setSolveResult({
        success: false,
        message: 'Please fix the validation errors before solving.',
      });
      return;
    }

    setIsSolving(true);
    setSolveResult(null);

    try {
      const response = await submitSolve(formData);
      navigate('/results', {
        state: {
          jobId: response.job_id,
          status: response.status,
          computationTimeSeconds: undefined,
          maxDisplacement: undefined,
          warnings: [],
          displacements: {},
          stresses: {},
          reactions: {},
        },
      });
    } catch (error) {
      setSolveResult({
        success: false,
        message: 'Solver API request failed. Please check the backend connection.',
      });
    } finally {
      setIsSolving(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    navigate('/signin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hcmut-light to-white">
      {/* Header */}
      <header className="bg-hcmut-secondary/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="container-responsive py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={hcmutLogo} alt="HCMUT logo" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-xl font-bold text-white">FEA Solver</h1>
                <p className="text-xs text-white/60">Finite Element Analysis</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mesh info badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/15">
                <Zap className="w-4 h-4 text-hcmut-accent" />
                <span className="text-sm text-white/80">
                  {totalElements} elements • {totalNodes} nodes
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container-responsive py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page title */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-hcmut-dark mb-2">
              Solver Configuration
            </h2>
            <p className="text-hcmut-dark/70 text-sm sm:text-base">
              Configure your finite element analysis parameters. All inputs are validated in real-time to prevent PSLG violations.
            </p>
          </div>

          {/* Result banner */}
          {solveResult && (
            <div
              className={`mb-6 p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
                solveResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              {solveResult.success ? (
                <CheckCircle className="w-5 h-5 text-hcmut-secondary flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${solveResult.success ? 'text-hcmut-secondary' : 'text-red-500'}`}>
                {solveResult.message}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Geometry Parameters Section */}
            <div className="bg-white backdrop-blur-sm rounded-xl border border-hcmut-primary/15 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('geometry')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-hcmut-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-hcmut-primary/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-hcmut-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-hcmut-dark">Geometry Parameters</h3>
                    <p className="text-sm text-hcmut-dark/65">Domain dimensions and element type</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getSectionErrorCount('geometry') > 0 && (
                    <span className="px-2 py-1 bg-red-500/10 text-red-600 text-xs font-medium rounded-full">
                      {getSectionErrorCount('geometry')} error(s)
                    </span>
                  )}
                  {isCollapsed.geometry ? (
                    <ChevronDown className="w-5 h-5 text-hcmut-dark/50" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-hcmut-dark/50" />
                  )}
                </div>
              </button>

              {!isCollapsed.geometry && (
                <div className="px-6 pb-6 space-y-5 border-t border-hcmut-primary/10 pt-4">
                  {/* Element type selector */}
                  <div>
                    <label className="block text-sm font-medium text-hcmut-dark mb-3">
                      Element Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`
                          relative flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all
                          ${formData.geometry.elementType === 'D2QU4N'
                            ? 'bg-hcmut-primary/10 border-hcmut-primary/50 ring-2 ring-hcmut-primary/40'
                            : 'bg-white border-hcmut-primary/15 hover:border-hcmut-primary/30'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="elementType"
                          value="D2QU4N"
                          checked={formData.geometry.elementType === 'D2QU4N'}
                          onChange={(e) => handleChange('geometry', 'elementType', e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          formData.geometry.elementType === 'D2QU4N'
                            ? 'bg-hcmut-primary/15'
                            : 'bg-hcmut-light'
                        }`}>
                          <Square className={`w-5 h-5 ${
                            formData.geometry.elementType === 'D2QU4N'
                            ? 'text-hcmut-secondary'
                              : 'text-hcmut-dark/45'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <span className="block font-medium text-hcmut-dark">D2QU4N</span>
                    <span className="block text-xs text-hcmut-dark/60">4-Node Quadrilateral</span>
                        </div>
                        {formData.geometry.elementType === 'D2QU4N' && (
                          <CheckCircle className="w-5 h-5 text-hcmut-secondary" />
                        )}
                      </label>

                      <label
                        className={`
                          relative flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all
                          ${formData.geometry.elementType === 'D2TR3N'
                            ? 'bg-hcmut-primary/10 border-hcmut-primary/50 ring-2 ring-hcmut-primary/40'
                            : 'bg-white border-hcmut-primary/15 hover:border-hcmut-primary/30'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="elementType"
                          value="D2TR3N"
                          checked={formData.geometry.elementType === 'D2TR3N'}
                          onChange={(e) => handleChange('geometry', 'elementType', e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          formData.geometry.elementType === 'D2TR3N'
                            ? 'bg-hcmut-primary/15'
                            : 'bg-hcmut-light'
                        }`}>
                          <Triangle className={`w-5 h-5 ${
                            formData.geometry.elementType === 'D2TR3N'
                            ? 'text-hcmut-secondary'
                              : 'text-hcmut-dark/45'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <span className="block font-medium text-hcmut-dark">D2TR3N</span>
                    <span className="block text-xs text-hcmut-dark/60">3-Node Triangle</span>
                        </div>
                        {formData.geometry.elementType === 'D2TR3N' && (
                          <CheckCircle className="w-5 h-5 text-hcmut-secondary" />
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Domain dimensions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="d1" className="block text-sm font-medium text-hcmut-dark/80 mb-2">
                        Length d₁ (x-direction) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="d1"
                          name="d1"
                          value={formData.geometry.d1}
                          onChange={(e) => handleChange('geometry', 'd1', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur('geometry', 'd1', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.1"
                          className={`
                            w-full px-4 py-2.5 pr-16
                            bg-white border rounded-xl
                            text-hcmut-dark placeholder-hcmut-dark/40
                            focus:outline-none focus:ring-2 focus:ring-hcmut-primary/50 focus:border-hcmut-primary
                            transition-all duration-200
                            ${errors.geometry.some(e => e.field === 'geometry.d1')
                              ? 'border-red-500'
                              : 'border-hcmut-primary/20 hover:border-hcmut-primary/40'
                            }
                          `}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-hcmut-dark/50">
                          m
                        </span>
                      </div>
                      {errors.geometry.find(e => e.field === 'geometry.d1') && (
                        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.geometry.find(e => e.field === 'geometry.d1')?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="d2" className="block text-sm font-medium text-hcmut-dark/80 mb-2">
                        Height d₂ (y-direction) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="d2"
                          name="d2"
                          value={formData.geometry.d2}
                          onChange={(e) => handleChange('geometry', 'd2', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur('geometry', 'd2', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.1"
                          className={`
                            w-full px-4 py-2.5 pr-16
                            bg-white border rounded-xl
                            text-hcmut-dark placeholder-hcmut-dark/40
                            focus:outline-none focus:ring-2 focus:ring-hcmut-primary/50 focus:border-hcmut-primary
                            transition-all duration-200
                            ${errors.geometry.some(e => e.field === 'geometry.d2')
                              ? 'border-red-500'
                              : 'border-hcmut-primary/20 hover:border-hcmut-primary/40'
                            }
                          `}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-hcmut-dark/50">
                          m
                        </span>
                      </div>
                      {errors.geometry.find(e => e.field === 'geometry.d2') && (
                        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.geometry.find(e => e.field === 'geometry.d2')?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Info tip */}
                  <div className="flex items-start gap-2 p-3 bg-hcmut-light/50 rounded-lg border border-hcmut-primary/10">
                    <Info className="w-4 h-4 text-hcmut-dark/60 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-hcmut-dark/60">
                      Domain size: {formData.geometry.d1} × {formData.geometry.d2} m (Area: {(formData.geometry.d1 * formData.geometry.d2).toFixed(4)} m²)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Mesh Configuration Section */}
            <div className="bg-white backdrop-blur-sm rounded-xl border border-hcmut-primary/15 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('mesh')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-hcmut-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-hcmut-primary/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-hcmut-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-hcmut-dark">Mesh Configuration</h3>
                    <p className="text-sm text-hcmut-dark/60">Element division in each direction</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getSectionErrorCount('mesh') > 0 && (
                    <span className="px-2 py-1 bg-red-500/10 text-red-600 text-xs font-medium rounded-full">
                      {getSectionErrorCount('mesh')} error(s)
                    </span>
                  )}
                  {isCollapsed.mesh ? (
                    <ChevronDown className="w-5 h-5 text-hcmut-dark/60" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-hcmut-dark/60" />
                  )}
                </div>
              </button>

              {!isCollapsed.mesh && (
                <div className="px-6 pb-6 space-y-5 border-t border-hcmut-primary/10 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="p" className="block text-sm font-medium text-hcmut-dark/80 mb-2">
                        Elements p (x-direction) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="p"
                        name="p"
                        value={formData.mesh.p}
                        onChange={(e) => handleChange('mesh', 'p', parseInt(e.target.value) || 0)}
                        onBlur={(e) => handleBlur('mesh', 'p', parseInt(e.target.value) || 0)}
                        min="1"
                        max="10000"
                        className={`
                          w-full px-4 py-2.5
                          bg-white border rounded-xl
                          text-hcmut-dark placeholder-hcmut-dark/40
                          focus:outline-none focus:ring-2 focus:ring-hcmut-primary/50 focus:border-hcmut-primary
                          transition-all duration-200
                          ${errors.mesh.some(e => e.field === 'mesh.p')
                            ? 'border-red-500'
                            : 'border-hcmut-primary/20 hover:border-hcmut-primary/40'
                          }
                        `}
                      />
                      {errors.mesh.find(e => e.field === 'mesh.p') && (
                        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.mesh.find(e => e.field === 'mesh.p')?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="m" className="block text-sm font-medium text-hcmut-dark/80 mb-2">
                        Elements m (y-direction) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="m"
                        name="m"
                        value={formData.mesh.m}
                        onChange={(e) => handleChange('mesh', 'm', parseInt(e.target.value) || 0)}
                        onBlur={(e) => handleBlur('mesh', 'm', parseInt(e.target.value) || 0)}
                        min="1"
                        max="10000"
                        className={`
                          w-full px-4 py-2.5
                          bg-white border rounded-xl
                          text-hcmut-dark placeholder-hcmut-dark/40
                          focus:outline-none focus:ring-2 focus:ring-hcmut-primary/50 focus:border-hcmut-primary
                          transition-all duration-200
                          ${errors.mesh.some(e => e.field === 'mesh.m')
                            ? 'border-red-500'
                            : 'border-hcmut-primary/20 hover:border-hcmut-primary/40'
                          }
                        `}
                      />
                      {errors.mesh.find(e => e.field === 'mesh.m') && (
                        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.mesh.find(e => e.field === 'mesh.m')?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Mesh info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-hcmut-light/50 rounded-lg border border-hcmut-primary/10 text-center">
                      <span className="block text-lg font-bold text-hcmut-dark">{formData.mesh.p}</span>
                      <span className="text-xs text-hcmut-dark/60">Elements X</span>
                    </div>
                    <div className="p-3 bg-hcmut-light/50 rounded-lg border border-hcmut-primary/10 text-center">
                      <span className="block text-lg font-bold text-hcmut-dark">{formData.mesh.m}</span>
                      <span className="text-xs text-hcmut-dark/60">Elements Y</span>
                    </div>
                    <div className="p-3 bg-hcmut-light/50 rounded-lg border border-hcmut-primary/10 text-center">
                      <span className="block text-lg font-bold text-hcmut-dark">{totalElements}</span>
                      <span className="text-xs text-hcmut-dark/60">Total Elements</span>
                    </div>
                    <div className="p-3 bg-hcmut-light/50 rounded-lg border border-hcmut-primary/10 text-center">
                      <span className="block text-lg font-bold text-hcmut-dark">{totalNodes}</span>
                      <span className="text-xs text-hcmut-dark/60">Total Nodes</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-hcmut-light/50 rounded-lg border border-hcmut-primary/10">
                    <Info className="w-4 h-4 text-hcmut-dark/60 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-hcmut-dark/60">
                      Element size: {elementSizeX.toFixed(4)} × {elementSizeY.toFixed(4)} m
                      {elementSizeX !== elementSizeY && (
                        <span className="text-amber-600 ml-1">
                          (non-uniform mesh)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Physical Properties Section */}
            <div className="bg-hcmut-light/50 backdrop-blur-sm rounded-xl border border-hcmut-primary/10 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('physical')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-hcmut-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-hcmut-primary/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-hcmut-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-hcmut-dark">Physical Properties</h3>
                    <p className="text-sm text-hcmut-dark/60">Material constants and behavior</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getSectionErrorCount('physical') > 0 && (
                    <span className="px-2 py-1 bg-red-500/10 text-red-600 text-xs font-medium rounded-full">
                      {getSectionErrorCount('physical')} error(s)
                    </span>
                  )}
                  {isCollapsed.physical ? (
                    <ChevronDown className="w-5 h-5 text-hcmut-dark/60" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-hcmut-dark/60" />
                  )}
                </div>
              </button>

              {!isCollapsed.physical && (
                <div className="px-6 pb-6 space-y-5 border-t border-hcmut-primary/10 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="E" className="block text-sm font-medium text-hcmut-dark/80 mb-2">
                        Young's Modulus (E) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="E"
                          name="E"
                          value={formData.physical.E}
                          onChange={(e) => handleChange('physical', 'E', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur('physical', 'E', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="1e6"
                          className={`
                            w-full px-4 py-2.5 pr-20
                            bg-white border rounded-xl
                            text-hcmut-dark placeholder-hcmut-dark/40
                            focus:outline-none focus:ring-2 focus:ring-hcmut-primary/50 focus:border-hcmut-primary
                            transition-all duration-200
                            ${errors.physical.some(e => e.field === 'physical.E')
                              ? 'border-red-500'
                              : 'border-hcmut-primary/20 hover:border-hcmut-primary/40'
                            }
                          `}
                        />
                        <span className="absolute right-12 top-1/2 -translate-y-1/2 text-sm text-hcmut-dark/50">
                          Pa
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-hcmut-dark/50">
                        Steel ≈ 210×10⁹, Aluminum ≈ 70×10⁹
                      </p>
                      {errors.physical.find(e => e.field === 'physical.E') && (
                        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.physical.find(e => e.field === 'physical.E')?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="nu" className="block text-sm font-medium text-hcmut-dark/80 mb-2">
                        Poisson's Ratio (ν) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="nu"
                          name="nu"
                          value={formData.physical.nu}
                          onChange={(e) => handleChange('physical', 'nu', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur('physical', 'nu', parseFloat(e.target.value) || 0)}
                          min="0"
                          max="0.499"
                          step="0.01"
                          className={`
                            w-full px-4 py-2.5 pr-16
                            bg-white border rounded-xl
                            text-hcmut-dark placeholder-hcmut-dark/40
                            focus:outline-none focus:ring-2 focus:ring-hcmut-primary/50 focus:border-hcmut-primary
                            transition-all duration-200
                            ${errors.physical.some(e => e.field === 'physical.nu')
                              ? 'border-red-500'
                              : 'border-hcmut-primary/20 hover:border-hcmut-primary/40'
                            }
                          `}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-hcmut-dark/50">
                          (0-0.5)
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-hcmut-dark/50">
                        Steel ≈ 0.3, Rubber ≈ 0.49
                      </p>
                      {errors.physical.find(e => e.field === 'physical.nu') && (
                        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.physical.find(e => e.field === 'physical.nu')?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Material stability warning */}
                  {formData.physical.nu >= 0.4 && formData.physical.nu < 0.5 && (
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-600">
                        High Poisson's ratio ({formData.physical.nu}). The material is near incompressibility limit. 
                        Consider using selective reduced integration for accurate results.
                      </p>
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 bg-hcmut-light/50 rounded-lg border border-hcmut-primary/10">
                    <Info className="w-4 h-4 text-hcmut-dark/60 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-hcmut-dark/60">
                      Bulk modulus K ≈ {(formData.physical.E / (3 * (1 - 2 * formData.physical.nu))).toExponential(2)} Pa
                      {formData.physical.nu >= 0.5 && (
                        <span className="text-red-500 ml-1">(unstable)</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Loads Section */}
            <div className="bg-hcmut-light/50 backdrop-blur-sm rounded-xl border border-hcmut-primary/10 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('loads')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-hcmut-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-hcmut-primary/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-hcmut-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7m14 13V7a2 2 0 00-2-2h-1.143a2 2 0 01-2-2v2.586A8 8 0 0015.657 16.343l2.657-2.657a2 2 0 012.657 2.657z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-hcmut-dark">Loads & Boundary Conditions</h3>
                    <p className="text-sm text-hcmut-dark/60">Applied forces and constraints</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getSectionErrorCount('loads') > 0 && (
                    <span className="px-2 py-1 bg-red-500/10 text-red-600 text-xs font-medium rounded-full">
                      {getSectionErrorCount('loads')} error(s)
                    </span>
                  )}
                  {isCollapsed.loads ? (
                    <ChevronDown className="w-5 h-5 text-hcmut-dark/60" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-hcmut-dark/60" />
                  )}
                </div>
              </button>

              {!isCollapsed.loads && (
                <div className="px-6 pb-6 space-y-5 border-t border-hcmut-primary/10 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="loadVal" className="block text-sm font-medium text-hcmut-dark/80 mb-2">
                        Total Load (traction) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="loadVal"
                          name="loadVal"
                          value={formData.loads.loadVal}
                          onChange={(e) => handleChange('loads', 'loadVal', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur('loads', 'loadVal', parseFloat(e.target.value) || 0)}
                          step="100"
                          className={`
                            w-full px-4 py-2.5 pr-16
                            bg-white border rounded-xl
                            text-hcmut-dark placeholder-hcmut-dark/40
                            focus:outline-none focus:ring-2 focus:ring-hcmut-primary/50 focus:border-hcmut-primary
                            transition-all duration-200
                            ${errors.loads.some(e => e.field === 'loads.loadVal')
                              ? 'border-red-500'
                              : 'border-hcmut-primary/20 hover:border-hcmut-primary/40'
                            }
                          `}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-hcmut-dark/50">
                          N/m
                        </span>
                      </div>
                      {errors.loads.find(e => e.field === 'loads.loadVal') && (
                        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.loads.find(e => e.field === 'loads.loadVal')?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="loadDirection" className="block text-sm font-medium text-hcmut-dark/80 mb-2">
                        Load Direction <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="loadDirection"
                        name="loadDirection"
                        value={formData.loads.loadDirection}
                        onChange={(e) => handleChange('loads', 'loadDirection', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-hcmut-primary/20 hover:border-hcmut-primary/40 rounded-xl text-hcmut-dark focus:outline-none focus:ring-2 focus:ring-hcmut-primary/50 focus:border-hcmut-primary transition-all duration-200"
                      >
                        <option value="x">X-direction (horizontal)</option>
                        <option value="y">Y-direction (vertical)</option>
                      </select>
                    </div>
                  </div>

                  {/* Boundary condition info */}
                  <div className="flex items-start gap-2 p-3 bg-hcmut-light/50 rounded-lg border border-hcmut-primary/10">
                    <Info className="w-4 h-4 text-hcmut-dark/60 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-hcmut-dark/60 space-y-1">
                      <p>• Fixed support: Left edge (x=0) — all DOFs constrained</p>
                      <p>• Traction load: Right edge (x=d₁) — distributed {formData.loads.loadVal} N/m</p>
                      <p>• Distributed evenly across {(formData.mesh.m + 1)} nodes</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scale Factor Section */}
            <div className="bg-hcmut-light/50 backdrop-blur-sm rounded-xl border border-hcmut-primary/10 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('scale')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-hcmut-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-hcmut-primary/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-hcmut-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-hcmut-dark">Scale Factor</h3>
                    <p className="text-sm text-hcmut-dark/65">Displacement visualization multiplier</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getSectionErrorCount('scale') > 0 && (
                    <span className="px-2 py-1 bg-red-500/10 text-red-600 text-xs font-medium rounded-full">
                      {getSectionErrorCount('scale')} error(s)
                    </span>
                  )}
                  {isCollapsed.scale ? (
                    <ChevronDown className="w-5 h-5 text-hcmut-dark/50" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-hcmut-dark/50" />
                  )}
                </div>
              </button>

              {!isCollapsed.scale && (
                <div className="px-6 pb-6 space-y-5 border-t border-hcmut-primary/10 pt-4">
                  <div>
                    <label htmlFor="scaleFactor" className="block text-sm font-medium text-hcmut-dark mb-2">
                      Visualization Scale Factor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="scaleFactor"
                      name="scaleFactor"
                      value={formData.scaleFactor}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Only update if valid number (not empty or NaN)
                        if (val !== '' && !isNaN(parseFloat(val))) {
                          handleChange('scaleFactor', 'scaleFactor', parseFloat(val));
                        }
                      }}
                      onBlur={(e) => {
                        const val = e.target.value;
                        // On blur, convert empty to default or use parsed value
                        const numVal = val === '' ? 100 : (parseFloat(val) || 100);
                        handleChange('scaleFactor', 'scaleFactor', numVal);
                        handleBlur('scale', 'scaleFactor', numVal);
                      }}
                      min="0.001"
                      max="10000"
                      step="any"
                      className={`
                        w-full px-4 py-2.5
                        bg-white border rounded-xl
                        text-hcmut-dark placeholder-hcmut-dark/40
                        focus:outline-none focus:ring-2 focus:ring-hcmut-primary/50 focus:border-hcmut-primary
                        transition-all duration-200
                        ${errors.scale.some(e => e.field === 'scaleFactor')
                          ? 'border-red-500'
                          : 'border-hcmut-primary/20 hover:border-hcmut-primary/40'
                        }
                      `}
                    />
                    {errors.scale.find(e => e.field === 'scaleFactor') && (
                      <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.scale.find(e => e.field === 'scaleFactor')?.message}
                      </p>
                    )}
                  </div>

                  {/* Scale presets */}
                  <div>
                    <p className="text-xs text-hcmut-dark/60 mb-2">Quick presets:</p>
                    <div className="flex flex-wrap gap-2">
                      {[10, 50, 100, 500, 1000].map((scale) => (
                        <button
                          key={scale}
                          type="button"
                          onClick={() => handleChange('scaleFactor', 'scaleFactor', scale)}
                          className={`
                            px-3 py-1.5 text-sm rounded-lg border transition-all
                            ${formData.scaleFactor === scale
                            ? 'bg-hcmut-primary/10 border-hcmut-primary/40 text-hcmut-secondary'
                            : 'bg-white border-hcmut-primary/15 text-hcmut-dark/70 hover:border-hcmut-primary/30'
                        }
                      `}
                        >
                          {scale}×
                        </button>
                      ))}
                    </div>
                  </div>

                    <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-hcmut-primary/10">
                    <Info className="w-4 h-4 text-hcmut-secondary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-hcmut-dark/70">
                      Scale factor {formData.scaleFactor}× amplifies displacements for visualization. 
                      Actual displacements remain unchanged in calculations.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-hcmut-primary/15 rounded-xl text-hcmut-dark hover:bg-hcmut-light hover:border-hcmut-primary/30 transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                Reset to Defaults
              </button>

              <button
                type="submit"
                disabled={isSolving}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold text-white
                  transition-all duration-200
                  ${isSolving
                  ? 'bg-hcmut-dark/40 cursor-not-allowed'
                  : isFormValid()
                      ? 'bg-gradient-to-r from-hcmut-primary to-hcmut-secondary hover:from-hcmut-accent hover:to-hcmut-primary shadow-lg shadow-hcmut-primary/25'
                      : 'bg-hcmut-dark/40 cursor-not-allowed opacity-50'
                }
              `}
              >
                {isSolving ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Solving...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run Solver
                  </>
                )}
              </button>
            </div>
          </form>

          {/* PSLG info */}
          <div className="mt-8 p-4 bg-white rounded-xl border border-hcmut-primary/10">
            <h4 className="text-sm font-semibold text-hcmut-dark mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-hcmut-secondary" />
              PSLG Validation
            </h4>
            <p className="text-xs text-hcmut-dark/70 leading-relaxed">
              This form implements real-time Planar Straight Line Graph (PSLG) validation to prevent 
              mesh generation failures. Key constraints enforced: positive geometry dimensions, valid 
              mesh divisions (1-10000), Poisson's ratio &lt; 0.5 for material stability, and 
              physically reasonable material properties.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default FEASolver;
