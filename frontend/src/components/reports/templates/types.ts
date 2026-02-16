export interface ReportData {
  title: string;
  subTitle?: string;
  generatedAt: Date;
  generatedBy: string;
  dateRange: { from?: Date; to?: Date };
  companyInfo: {
    name: string;
    address: string;
    email: string;
    phone: string;
    logoUrl?: string;
  };
  metrics: { label: string; value: string | number; change?: number }[];
  tableHeaders: string[];
  tableRows: (string | number | React.ReactNode)[][];
  footerText?: string;
}

export interface ReportTemplateProps {
  data: ReportData;
}
