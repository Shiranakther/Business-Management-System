import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { Building2, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';
import authHeroImg from '@/assets/auth-hero.png';

export default function AuthLayout() {
  const { currentUser } = useAppStore();

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Left / Hero Section - Desktop only */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-12 text-white overflow-hidden bg-slate-950">
        {/* Background Image with Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{ backgroundImage: `url(${authHeroImg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/75 to-slate-900/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent" />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/20 backdrop-blur-md border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              BusinessPro <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground border border-primary/30">BMS</span>
            </span>
            <p className="text-xs text-slate-400">Enterprise Resource & Management</p>
          </div>
        </div>

        {/* Center Content / Highlights */}
        <div className="relative z-10 space-y-6 max-w-xl my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-sky-200">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            Next-Generation Business Operating System
          </div>
          
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white drop-shadow-sm">
            Manage your entire business workflow in one unified platform.
          </h1>
          
          <p className="text-base text-slate-300 leading-relaxed">
            Real-time inventory intelligence, seamless multi-channel orders, automated Sri Lankan payroll & statutory deductions, and smart financial analytics.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <div className="flex items-center gap-2.5 text-sm text-slate-200 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-lg p-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Real-Time Inventory & Alerts</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-200 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-lg p-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Smart Sri Lanka Payroll (EPF/ETF)</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-200 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-lg p-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Orders & Courier Tracking</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-200 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-lg p-2.5">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Enterprise-Grade Security</span>
            </div>
          </div>
        </div>

        {/* Footer Quote */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
          <p>© {new Date().getFullYear()} Business Management System. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </div>

      {/* Right / Form Section */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16 relative overflow-y-auto">
        {/* Mobile Header Branding */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-foreground">BusinessPro BMS</span>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        </div>

        {/* Outlet Container for Login / Register */}
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          <Outlet />
        </div>

        {/* Mobile Footer */}
        <p className="lg:hidden mt-8 text-xs text-center text-muted-foreground">
          © {new Date().getFullYear()} Business Management System.
        </p>
      </div>
    </div>
  );
}
