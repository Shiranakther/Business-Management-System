import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import { usePermissionsStore } from '@/stores/permissionsStore';

export default function ProtectedRoute() {
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, setCurrentUser, currentTenant, setCurrentTenant } = useAppStore();
  const { setCurrentUserRole } = usePermissionsStore();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setCurrentUser(null);
          setCurrentTenant(null);
          setIsLoading(false);
          return;
        }

        if (!currentUser) {
          // Fetch user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          // Fetch role
          const { data: userRole } = await supabase
             .from('user_roles')
             .select('role_id')
             .eq('user_id', session.user.id)
             .single();

          const roleId = userRole?.role_id || 'viewer';
          setCurrentUserRole(roleId);

          // Prepare User Object
          const userObj = {
            id: session.user.id,
            email: session.user.email!,
            firstName: profile?.first_name || 'User',
            lastName: profile?.last_name || '',
            isSystemAdmin: roleId === 'admin',
            createdAt: new Date(session.user.created_at),
          };
          setCurrentUser(userObj);

          // Fetch Tenant Context
          let tenantContext = null;
          if (profile?.organization_id) {
             const { data: org } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', profile.organization_id)
                .single();
             
             if (org) {
                 tenantContext = {
                     id: org.id,
                     name: org.name,
                     slug: org.slug,
                     status: 'ACTIVE' as 'ACTIVE',
                     subscriptionPlan: 'ENTERPRISE' as 'ENTERPRISE',
                     type: org.type,
                     address: org.address,
                     city: org.city,
                     state: org.state,
                     zipCode: org.zip_code,
                     country: org.country,
                     registrationNumber: org.registration_number,
                     taxId: org.tax_id,
                     settings: {
                         logoUrl: org.logo_url,
                         currency: org.currency,
                         timezone: org.timezone,
                         dateFormat: org.date_format,
                     }
                 };
                 setCurrentTenant(tenantContext);
             }
          }

          // Handle Redirections based on Tenant existence
          if (!tenantContext && roleId === 'admin' && location.pathname !== '/setup-business') {
              // Admin with no business -> Setup
              // However, we can't navigate inside useEffect easily without causing loops if not careful.
              // But here we are setting state. The render cycle will handle Navigate if we structure it right?
              // No, we should probably let the component logic below handle it.
              // But wait, Navigate component is only returned if !currentUser.
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, _session: Session | null) => {
        if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
        }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setCurrentUser, setCurrentUserRole, setCurrentTenant]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Business Setup Redirection Logic
  // ONLY enforce this for users who are supposed to have an organization (Admins usually create it)
  // If a user is invited (not admin), they should already be linked to one via profile.
  // If currentUser is admin but has no tenant, they must create one.
  if (currentUser.isSystemAdmin && !currentTenant) {
      if (location.pathname !== '/setup-business') {
          return <Navigate to="/setup-business" replace />;
      }
  } 
  
  // If tenant exists, prevent re-entry to setup page
  if (currentTenant && location.pathname === '/setup-business') {
      return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
