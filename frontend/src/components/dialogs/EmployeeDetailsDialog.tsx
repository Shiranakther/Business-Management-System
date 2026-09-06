import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api';
import { 
  Calendar, 
  Mail, 
  MapPin, 
  Phone, 
  Briefcase, 
  User, 
  Clock, 
  DollarSign,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import type { Employee } from '@/types';

interface EmployeeDetailsDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success border-success/20',
  ON_LEAVE: 'bg-warning/10 text-warning border-warning/20',
  TERMINATED: 'bg-destructive/10 text-destructive border-destructive/20',
};

function formatDate(date: Date | string | undefined | null) {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function EmployeeDetailsDialog({ employee, open, onOpenChange }: EmployeeDetailsDialogProps) {
  const [documentStatus, setDocumentStatus] = useState<{ documents: any[], missingTypes: string[] }>({ documents: [], missingTypes: [] });
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  useEffect(() => {
    async function fetchDocuments() {
      if (!employee?.id || !open) return;
      setIsLoadingDocs(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await axios.get(`${API_BASE_URL}/api/hr/documents/${employee.id}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        setDocumentStatus(response.data);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setIsLoadingDocs(false);
      }
    }
    fetchDocuments();
  }, [employee?.id, open]);

  if (!employee) return null;

  const getLeaveColor = (remaining: number, total: number) => {
    if (!total || total === 0) return 'bg-muted text-muted-foreground';
    const percent = remaining / total;
    if (percent === 0) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (percent < 0.5) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-success/10 text-success border-success/20';
  };

  const documentTypes = [
    { type: 'NIC', label: 'NIC' },
    { type: 'SCHOOL_LEAVING_CERTIFICATE', label: 'School Leaving Certificate' },
    { type: 'POLICE_REPORT', label: 'Police Report' },
    { type: 'GN_CERTIFICATE', label: 'GN Certificate' },
    { type: 'OL_CERTIFICATE', label: 'O/L Certificate' },
    { type: 'AL_CERTIFICATE', label: 'A/L Certificate' },
    { type: 'DEGREE_CERTIFICATE', label: 'Degree Certificate' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Avatar */}
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {employee.firstName[0]}{employee.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-2xl font-bold">
                  {employee.firstName} {employee.lastName}
                </h2>
                <Badge variant="outline" className={statusColors[employee.status]}>
                  {employee.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mt-1">{employee.position}</p>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Contact Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{employee.email}</p>
                </div>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{employee.phone}</p>
                  </div>
                </div>
              )}
              {employee.address && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{employee.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Employment Details */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Employment Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employee ID</p>
                  <p className="font-medium">{employee.employeeId}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{employee.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hire Date</p>
                  <p className="font-medium">{formatDate(employee.hireDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employment Type</p>
                  <p className="font-medium">{employee.employmentType || 'Full-time'}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Leave Balances */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Leave Balances
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs text-muted-foreground mb-1">Annual</p>
                <Badge variant="outline" className={getLeaveColor(employee.annualLeaveBalance ?? 14, 14)}>
                  {employee.annualLeaveBalance ?? 14} remaining
                </Badge>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs text-muted-foreground mb-1">Casual</p>
                <Badge variant="outline" className={getLeaveColor(employee.casualLeaveBalance ?? 7, 7)}>
                  {employee.casualLeaveBalance ?? 7} remaining
                </Badge>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs text-muted-foreground mb-1">Medical</p>
                <Badge variant="outline" className={getLeaveColor(employee.medicalLeaveBalance ?? 7, 7)}>
                  {employee.medicalLeaveBalance ?? 7} remaining
                </Badge>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs text-muted-foreground mb-1">Short</p>
                <Badge variant="outline" className={getLeaveColor(employee.shortLeaveBalance ?? 4, 4)}>
                  {employee.shortLeaveBalance ?? 4} remaining
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Compensation */}
          {employee.salary && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Compensation
                </h3>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <DollarSign className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Annual Salary</p>
                    <p className="text-2xl font-bold text-success">{formatCurrency(employee.salary)}</p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Additional Information */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Additional Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {employee.emergencyContact && (
                <div>
                  <p className="text-sm text-muted-foreground">Emergency Contact</p>
                  <p className="font-medium">{employee.emergencyContact}</p>
                </div>
              )}
              {employee.dateOfBirth && (
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{formatDate(employee.dateOfBirth)}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Document Status */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Document Status
            </h3>
            {isLoadingDocs ? (
              <p className="text-sm text-muted-foreground">Loading documents...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {documentTypes.map(doc => {
                  const isSubmitted = !documentStatus.missingTypes.includes(doc.type);
                  return (
                    <div key={doc.type} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                      <span className="text-sm font-medium">{doc.label}</span>
                      {isSubmitted ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Submitted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                          <XCircle className="w-3 h-3" /> Not Submitted
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
