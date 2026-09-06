import { useState, useEffect } from 'react';
import { Users, Clock, CalendarDays, DollarSign, Lock, Loader2, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeeList } from '@/components/hr/EmployeeList';
import { AttendanceTabRoot } from '@/components/hr/AttendanceTabRoot';
import { LeaveManagementPanel } from '@/components/hr/LeaveManagementPanel';
import { PayrollPanel } from '@/components/hr/PayrollPanel';
import { HRSettingsTabRoot } from '@/components/hr/HRSettingsTabRoot';
import { usePermissions } from '@/hooks/usePermissions';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function HR() {
  const { canRead } = usePermissions();
  const [stats, setStats] = useState({ totalEmployees: 0, activeEmployees: 0, onLeaveEmployees: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!canRead('hr')) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await axios.get(`${API_BASE_URL}/api/hr/stats`, {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        setStats(res.data);
      } catch (error) {
        console.error('Failed to fetch HR stats:', error);
        toast.error('Failed to load HR statistics');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [canRead]);

  if (!canRead('hr')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Lock className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view HR.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Human Resources</h1>
          <p className="page-description">Manage employees, attendance, leaves, and payroll</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
                ) : (
                  <p className="text-xl font-semibold">{stats.totalEmployees}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Users className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
                ) : (
                  <p className="text-xl font-semibold">{stats.activeEmployees}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
                ) : (
                  <p className="text-xl font-semibold">{stats.onLeaveEmployees}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="mb-4">
            <TabsTrigger value="employees" className="gap-2">
                <Users className="w-4 h-4" />
                Employees
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
                <Clock className="w-4 h-4" />
                Attendance
            </TabsTrigger>
            <TabsTrigger value="leaves" className="gap-2">
                <CalendarDays className="w-4 h-4" />
                Leave Management
            </TabsTrigger>
            <TabsTrigger value="payroll" className="gap-2">
                <DollarSign className="w-4 h-4" />
                Payroll & Advances
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
            </TabsTrigger>
        </TabsList>
        
        <TabsContent value="employees">
            <EmployeeList />
        </TabsContent>
        
        <TabsContent value="attendance">
            <AttendanceTabRoot />
        </TabsContent>
        
        <TabsContent value="leaves">
            <LeaveManagementPanel />
        </TabsContent>
        
        <TabsContent value="payroll">
            <PayrollPanel />
        </TabsContent>

        <TabsContent value="settings">
            <HRSettingsTabRoot />
        </TabsContent>
      </Tabs>
    </div>
  );
}
