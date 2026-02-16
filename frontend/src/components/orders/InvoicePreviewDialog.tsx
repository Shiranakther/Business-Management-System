import { useRef } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';
import type { Order } from '@/types';

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(value);
}

const statusColors: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  SHIPPED: '#0ea5e9',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
};

const paymentStatusColors: Record<string, string> = {
  PENDING: '#f59e0b',
  PAID: '#10b981',
  REFUNDED: '#ef4444',
};

export function InvoicePreviewDialog({ open, onOpenChange, order }: InvoicePreviewDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && contentRef.current) {
      const styleTags = Array.from(document.querySelectorAll('style')).map(s => s.outerHTML).join('');
      const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.outerHTML).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice ${order.orderNumber}</title>
            ${linkTags}
            ${styleTags}
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @page { margin: 0.5cm; size: A4; }
              }
              body { background: white; }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-slate-100 overflow-hidden">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-10">
          <div>
            <h2 className="font-semibold text-lg">Invoice Preview</h2>
            <p className="text-sm text-muted-foreground">{order.orderNumber}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print Invoice
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="ghost" size="icon">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-100">
          <div 
            ref={contentRef}
            className="w-[210mm] min-h-[297mm] bg-white shadow-lg p-12"
          >
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">INVOICE</h1>
                <div className="text-sm text-slate-600 space-y-1">
                  <p className="font-semibold text-lg text-slate-900">Acme Corp Pvt Ltd</p>
                  <p>123 Business Park</p>
                  <p>Colombo 03, Sri Lanka</p>
                  <p>+94 11 234 5678</p>
                  <p>invoices@acmecorp.com</p>
                </div>
              </div>
              <div className="text-right">
                <div className="mb-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Invoice Number</p>
                  <p className="text-xl font-bold font-mono">{order.orderNumber}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-slate-500">Date: </span>
                    <span className="font-semibold">{format(new Date(order.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Due Date: </span>
                    <span className="font-semibold">{format(new Date(new Date(order.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To Section */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bill To</p>
                <div className="text-sm">
                  <p className="font-bold text-base text-slate-900 mb-1">{order.customerName}</p>
                  <p className="text-slate-600">Customer ID: {order.customerId}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Invoice Details</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status:</span>
                    <span 
                      className="font-semibold px-2 py-0.5 rounded text-xs"
                      style={{ backgroundColor: statusColors[order.status] + '20', color: statusColors[order.status] }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payment:</span>
                    <span 
                      className="font-semibold px-2 py-0.5 rounded text-xs"
                      style={{ backgroundColor: paymentStatusColors[order.paymentStatus] + '20', color: paymentStatusColors[order.paymentStatus] }}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-y-2 border-slate-900">
                  <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-700">Description</th>
                  <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-700">Quantity</th>
                  <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-700">Unit Price</th>
                  <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={item.id} className={index !== order.items.length - 1 ? 'border-b border-slate-200' : ''}>
                    <td className="py-3 px-2">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">Item ID: {item.inventoryItemId}</p>
                    </td>
                    <td className="py-3 px-2 text-center font-medium">{item.quantity}</td>
                    <td className="py-3 px-2 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 px-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="flex justify-end mb-12">
              <div className="w-80">
                <div className="space-y-2 pb-3 mb-3 border-b border-slate-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax (9%):</span>
                    <span className="font-medium">{formatCurrency(order.tax)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-slate-900 text-white px-4 py-3 rounded">
                  <span className="font-bold text-lg">TOTAL:</span>
                  <span className="font-bold text-2xl">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="bg-slate-50 p-6 rounded-lg mb-8">
              <h3 className="font-semibold text-sm mb-3">Payment Terms & Information</h3>
              <div className="text-xs text-slate-600 space-y-1">
                <p>• Payment is due within 30 days from the invoice date</p>
                <p>• Please include invoice number in payment reference</p>
                <p>• Bank: National Bank of Ceylon | Account: 1234567890 | SWIFT: NBCXLKLX</p>
                <p>• For wire transfers, please add transfer fees to payment amount</p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-6 text-center">
              <p className="text-xs text-slate-500">
                Thank you for your business! For questions regarding this invoice, contact us at invoices@acmecorp.com
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Acme Corp Pvt Ltd • Tax ID: 123456789V • Company Reg No: PV 12345
              </p>
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
