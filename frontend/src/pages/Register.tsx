import { useState, FormEvent, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, AlertCircle } from 'lucide-react';

const hcmutLogo = new URL('../../logo/01_logobachkhoatoi.png', import.meta.url).href;

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
  general?: string;
}

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({ fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateField = (name: keyof FormData, value: string | boolean) => {
    if (name === 'fullName') return String(value).trim().length < 2 ? 'Full name must be at least 2 characters' : undefined;
    if (name === 'email') {
      if (!String(value).trim()) return 'Email is required';
      if (!emailRegex.test(String(value))) return 'Please enter a valid email address';
    }
    if (name === 'password') {
      if (!value) return 'Password is required';
      if (String(value).length < 8) return 'Password must be at least 8 characters';
    }
    if (name === 'confirmPassword') return String(value) !== formData.password ? 'Passwords do not match' : undefined;
    if (name === 'acceptTerms') return value ? undefined : 'You must accept the terms and conditions';
    return undefined;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    if (errors[name as keyof FormErrors]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    const error = validateField(name as keyof FormData, nextValue);
    if (error) setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    (['fullName', 'email', 'password', 'confirmPassword', 'acceptTerms'] as const).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) nextErrors[key] = error;
    });
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setIsLoading(false);
    navigate('/signin');
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
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-2">Create account</h2>
            <p className="text-[#1A1A1A]/70 text-sm sm:text-base">Start your free FEA analysis journey</p>
          </div>

          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-[#1A1A1A] mb-2">Full name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="w-5 h-5 text-[#1A1A1A]/45" /></div>
                <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} onBlur={handleBlur} autoComplete="name" placeholder="John Doe" className={`w-full pl-12 pr-4 py-3 bg-white border rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/35 focus:outline-none focus:ring-2 focus:ring-[#1488D8]/50 focus:border-[#1488D8] transition-all duration-200 ${errors.fullName ? 'border-red-500' : 'border-[#1488D8]/15 hover:border-[#1488D8]/30'}`} disabled={isLoading} />
              </div>
              {errors.fullName && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A] mb-2">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="w-5 h-5 text-[#1A1A1A]/45" /></div>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} autoComplete="email" placeholder="you@example.com" className={`w-full pl-12 pr-4 py-3 bg-white border rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/35 focus:outline-none focus:ring-2 focus:ring-[#1488D8]/50 focus:border-[#1488D8] transition-all duration-200 ${errors.email ? 'border-red-500' : 'border-[#1488D8]/15 hover:border-[#1488D8]/30'}`} disabled={isLoading} />
              </div>
              {errors.email && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1A1A1A] mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="w-5 h-5 text-[#1A1A1A]/45" /></div>
                <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} onBlur={handleBlur} autoComplete="new-password" placeholder="••••••••" className={`w-full pl-12 pr-12 py-3 bg-white border rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/35 focus:outline-none focus:ring-2 focus:ring-[#1488D8]/50 focus:border-[#1488D8] transition-all duration-200 ${errors.password ? 'border-red-500' : 'border-[#1488D8]/15 hover:border-[#1488D8]/30'}`} disabled={isLoading} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#1A1A1A]/45 hover:text-[#1488D8] transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
              {errors.password && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1A1A1A] mb-2">Confirm password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="w-5 h-5 text-[#1A1A1A]/45" /></div>
                <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} autoComplete="new-password" placeholder="••••••••" className={`w-full pl-12 pr-12 py-3 bg-white border rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/35 focus:outline-none focus:ring-2 focus:ring-[#1488D8]/50 focus:border-[#1488D8] transition-all duration-200 ${errors.confirmPassword ? 'border-red-500' : 'border-[#1488D8]/15 hover:border-[#1488D8]/30'}`} disabled={isLoading} />
                <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#1A1A1A]/45 hover:text-[#1488D8] transition-colors" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
              {errors.confirmPassword && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.confirmPassword}</p>}
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} onBlur={handleBlur} className="w-4 h-4 mt-0.5 rounded border-[#1488D8]/20 bg-white text-[#1488D8] focus:ring-[#1488D8]/50 focus:ring-offset-0 cursor-pointer" />
              <span className="text-sm text-[#1A1A1A]/70 group-hover:text-[#1A1A1A] transition-colors leading-relaxed">I agree to the <a href="#terms" className="text-[#1488D8] hover:text-[#030391] underline">Terms of Service</a> and <a href="#privacy" className="text-[#1488D8] hover:text-[#030391] underline">Privacy Policy</a></span>
            </label>
            {errors.acceptTerms && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.acceptTerms}</p>}

            <button type="submit" disabled={isLoading} className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[#1488D8] hover:bg-[#00C2FF] shadow-lg shadow-[#1488D8]/20 focus:outline-none focus:ring-2 focus:ring-[#1488D8]/50 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2">{isLoading ? 'Creating account...' : 'Create account'}</button>

            <Link to="/signin" className="block w-full py-3 px-4 rounded-xl font-semibold bg-white border border-[#1488D8]/15 text-[#1A1A1A] hover:bg-[#F5F7FA] hover:border-[#1488D8]/30 focus:outline-none focus:ring-2 focus:ring-[#1488D8]/50 focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 text-center">Sign in instead</Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;
