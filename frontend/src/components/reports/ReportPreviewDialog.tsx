import { useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, FileJson } from 'lucide-react';
import { ModernTemplate } from './templates/ModernTemplate';
import { ClassicTemplate } from './templates/ClassicTemplate';
import { MinimalTemplate } from './templates/MinimalTemplate';
import type { ReportData } from './templates/types';
import { toast } from 'sonner';

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: 'modern' | 'classic' | 'minimal';
  data: ReportData;
}

export function ReportPreviewDialog({ open, onOpenChange, template, data }: ReportPreviewDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    // This uses a hidden iframe trick or a simple window print with media queries
    // Since we are inside a react app, the simplest way is to open a new window w/ content
    // Or simpler: use media queries on the main page to hide everything active except the report
    
    // Approach: Open new window
    const printWindow = window.open('', '_blank');
    if (printWindow && contentRef.current) {
        // Get all stylesheets
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const styles = Array.from(document.styleSheets)
          .map(styleSheet => {
            try {
              return Array.from(styleSheet.cssRules)
                .map(rule => rule.cssText)
                .join('');
            } catch (e) {
              return '';
            }
          })
          .join('');

        // Also get Tailwind styles if injected
        // For Vite + Tailwind, styles might be in <style> tags
        const styleTags = Array.from(document.querySelectorAll('style')).map(s => s.outerHTML).join('');
        const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.outerHTML).join('');

        printWindow.document.write(`
          <html>
            <head>
              <title>${data.title}</title>
              ${linkTags}
              ${styleTags}
              <script src="https://cdn.tailwindcss.com"></script> 
              <style>
                body { background: white; -webkit-print-color-adjust: exact; }
                @page { margin: 0.5cm; size: A4; }
              </style>
            </head>
            <body>
              ${contentRef.current.innerHTML}
              <script>
                setTimeout(() => {
                    window.print();
                    window.close();
                }, 500);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
    }
  };

  const handleExportCSV = () => {
      // Basic CSV Generation
      const headers = data.tableHeaders.join(',');
      const rows = data.tableRows.map(row => row.join(',')).join('\n');
      const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${data.title.replace(/\s+/g, '_').toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Report exported as CSV');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 bg-slate-100 overflow-hidden">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-10">
           <div>
              <h2 className="font-semibold text-lg">Report Preview</h2>
              <p className="text-sm text-muted-foreground">Template: {template.charAt(0).toUpperCase() + template.slice(1)}</p>
           </div>
           <div className="flex gap-2">
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                  <FileJson className="w-4 h-4 mr-2" />
                  CSV
              </Button>
              {/* PDF download is handled via print -> Save as PDF usually, browser native */}
              <Button onClick={handlePrint} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
              </Button>
              <Button onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Report
              </Button>
           </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-100">
           <div 
             ref={contentRef}
             className="w-[210mm] min-h-[297mm] bg-white shadow-lg mx-auto overflow-hidden print:shadow-none print:w-full"
             style={{ transformOrigin: 'top center' }} // Could add scale slider later
           >
              {template === 'modern' && <ModernTemplate data={data} />}
              {template === 'classic' && <ClassicTemplate data={data} />}
              {template === 'minimal' && <MinimalTemplate data={data} />}
           </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
