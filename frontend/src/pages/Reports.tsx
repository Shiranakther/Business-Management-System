import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  FileText,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { ReportDateRangePicker } from '@/components/reports/ReportDateRangePicker';
import { ReportFilterDialog, type ReportFilters } from '@/components/reports/ReportFilterDialog';
import { type ReportTemplateType } from '@/components/reports/ReportTemplateSelector';
import { ReportViewer } from '@/components/reports/ReportViewer';

type ReportType = 'sales' | 'inventory' | 'expenses' | 'hr';

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: typeof TrendingUp;
  color: string;
}

const reportTypes: ReportConfig[] = [
  {
    id: 'sales',
    title: 'Sales Report',
    description: 'Revenue, orders, and sales performance metrics',
    icon: TrendingUp,
    color: 'bg-success/10 text-success',
  },
  {
    id: 'inventory',
    title: 'Inventory Report',
    description: 'Stock levels, valuations, and movement analysis',
    icon: BarChart3,
    color: 'bg-accent/10 text-accent',
  },
  {
    id: 'expenses',
    title: 'Expense Report',
    description: 'Expense breakdown by category and department',
    icon: PieChart,
    color: 'bg-warning/10 text-warning',
  },
  // HR Report not implemented in backend yet, keeping placeholder
  {
    id: 'hr',
    title: 'HR Report',
    description: 'Headcount, payroll, and department analytics',
    icon: FileText,
    color: 'bg-primary/10 text-primary',
  },
];

const initialFilters: ReportFilters = {
  dateRange: { from: undefined, to: undefined },
  customers: [],
  paymentStatus: [],
  orderStatus: [],
  salesChannel: [],
  categories: [],
  stockStatus: [],
  locations: [],
  expenseCategories: [],
  departments: [],
  expenseStatus: [],
  employmentType: [],
  hrDepartments: [],
  employeeStatus: [],
  minValue: undefined,
  maxValue: undefined,
};

export default function Reports() {
  const [globalDateRange, setGlobalDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportConfig | null>(null);
  const [showReportView, setShowReportView] = useState(false);
  const [reportFilters, setReportFilters] = useState<Record<ReportType, ReportFilters>>({
    sales: { ...initialFilters },
    inventory: { ...initialFilters },
    expenses: { ...initialFilters },
    hr: { ...initialFilters },
  });
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateType>('modern');

  const handleViewReport = (report: ReportConfig) => {
    setActiveReport(report);
    // Apply global date range to report-specific filters if set
    if (globalDateRange.from || globalDateRange.to) {
      setReportFilters(prev => ({
        ...prev,
        [report.id]: {
          ...prev[report.id],
          dateRange: globalDateRange,
        },
      }));
    }
    setFilterDialogOpen(true);
  };

  const handleFiltersChange = (filters: ReportFilters) => {
    if (activeReport) {
      setReportFilters(prev => ({
        ...prev,
        [activeReport.id]: filters,
      }));
    }
  };

  const handleGenerateReport = (template: ReportTemplateType) => {
    if (activeReport) {
      setSelectedTemplate(template);
      setFilterDialogOpen(false);
      setShowReportView(true);
    }
  };

  const closeReportView = () => {
      setShowReportView(false);
      setActiveReport(null);
  };

  const getFilterCount = (reportId: ReportType): number => {
    const filters = reportFilters[reportId];
    let count = 0;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    // ... basic logic kept
    return count;
  };

  if (showReportView && activeReport) {
      return (
          <div className="animate-fade-in space-y-6">
               <Button variant="ghost" onClick={closeReportView} className="mb-4 pl-0 hover:pl-2 transition-all">
                   <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
               </Button>
               <ReportViewer 
                  reportType={activeReport.id} 
                  filters={reportFilters[activeReport.id]}
                  template={selectedTemplate}
                  onClose={closeReportView}
               />
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Reports</h1>
          <p className="page-description">Generate and export business reports</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Global Date Range:</span>
          <ReportDateRangePicker
            dateRange={globalDateRange}
            onDateRangeChange={setGlobalDateRange}
          />
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const filterCount = getFilterCount(report.id);
          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewReport(report)}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${report.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{report.title}</h3>
                      {filterCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {filterCount} filter{filterCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {report.description}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleViewReport(report); }}>
                        <Filter className="w-4 h-4 mr-2" />
                        Configure & View
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Report Filter Dialog */}
      {activeReport && (
        <ReportFilterDialog
          open={filterDialogOpen}
          onOpenChange={setFilterDialogOpen}
          reportType={activeReport.id}
          reportTitle={activeReport.title}
          filters={reportFilters[activeReport.id]}
          onFiltersChange={handleFiltersChange}
          onGenerateReport={handleGenerateReport}
        />
      )}
    </div>
  );
}
