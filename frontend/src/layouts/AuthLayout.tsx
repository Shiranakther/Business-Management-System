import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';

export default function AuthLayout() {
  const { currentUser } = useAppStore();

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
          <Outlet />
      </div>
    </div>
  );
}
