import { useState, FormEvent, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';

const hcmutLogo = new URL('../../logo/01_logobachkhoatoi.png', import.meta.url).href;

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function SignIn() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateField = (name: keyof FormData, value: string) => {
    if (name === 'email') {
      if (!value.trim()) return 'Email is required';
      if (!emailRegex.test(value)) return 'Please enter a valid email address';
    }
    if (name === 'password') {
      if (!value) return 'Password is required';
      if (value.length < 6) return 'Password must be at least 6 characters';
    }
    return undefined;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const error = validateField(name as keyof FormData, value);
    if (error) setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    const emailError = validateField('email', formData.email);
    const passwordError = validateField('password', formData.password);
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsLoading(false);
    navigate('/solver');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-black/5 shadow-[0_20px_60px_rgba(3,3,145,0.16)] p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-8">
            <img src={hcmutLogo} alt="HCMUT logo" className="h-10 w-auto object-contain" />
            <span className="text-xl font-bold text-[#1A1A1A]">FEA Solver</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-2">Welcome back</h2>
            <p className="text-[#1A1A1A]/70 text-sm sm:text-base">Sign in to access your FEA projects</p>
          </div>

          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A] mb-2">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-[#1A1A1A]/45" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`w-full pl-12 pr-4 py-3 bg-white border rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/35 focus:outline-none focus:ring-2 focus:ring-[#1488D8]/50 focus:border-[#1488D8] transition-all duration-200 ${errors.email ? 'border-red-500' : 'border-[#1488D8]/15 hover:border-[#1488D8]/30'}`}
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1A1A1A] mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-[#1A1A1A]/45" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-3 bg-white border rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/35 focus:outline-none focus:ring-2 focus:ring-[#1488D8]/50 focus:border-[#1488D8] transition-all duration-200 ${errors.password ? 'border-red-500' : 'border-[#1488D8]/15 hover:border-[#1488D8]/30'}`}
                  disabled={isLoading}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#1A1A1A]/45 hover:text-[#1488D8] transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-[#1488D8]/20 bg-white text-[#1488D8] focus:ring-[#1488D8]/50 focus:ring-offset-0 cursor-pointer" />
                <span className="text-sm text-[#1A1A1A]/70 group-hover:text-[#1A1A1A] transition-colors">Remember me</span>
              </label>
              <a href="#forgot" className="text-sm text-[#1488D8] hover:text-[#030391] transition-colors">Forgot password?</a>
            </div>

            <button type="submit" disabled={isLoading} className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[#1488D8] hover:bg-[#00C2FF] shadow-lg shadow-[#1488D8]/20 focus:outline-none focus:ring-2 focus:ring-[#1488D8]/50 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            <Link to="/register" className="block w-full py-3 px-4 rounded-xl font-semibold bg-white border border-[#1488D8]/15 text-[#1A1A1A] hover:bg-[#F5F7FA] hover:border-[#1488D8]/30 focus:outline-none focus:ring-2 focus:ring-[#1488D8]/50 focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 text-center">Create an account</Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
