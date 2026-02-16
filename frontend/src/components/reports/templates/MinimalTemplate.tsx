import type { ReportTemplateProps } from './types.ts';
import { format } from 'date-fns';

export function MinimalTemplate({ data }: ReportTemplateProps) {
  return (
    <div className="w-full bg-white text-slate-900 p-6 font-sans" id="report-content">
      {/* Minimal Header */}
      <div className="flex justify-between items-center border-b pb-3 mb-6">
        <div className="flex items-center gap-4">
           {data.companyInfo.logoUrl && (
             <img src={data.companyInfo.logoUrl} alt="Logo" className="h-8 w-auto" />
           )}
           <div className="text-xs text-slate-500">
             <p className="font-semibold text-slate-900">{data.companyInfo.name}</p>
             <p>{data.companyInfo.email}</p>
           </div>
        </div>
        <div className="text-right text-xs">
           <p className="font-bold text-sm">{data.title}</p>
           <p className="text-slate-500">{format(data.generatedAt, 'dd/MM/yyyy')}</p>
        </div>
      </div>

      {/* Compact Metrics */}
      {data.metrics.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-6 text-xs">
            {data.metrics.map((metric, i) => (
                <div key={i} className="border-l-2 border-slate-300 pl-2">
                    <p className="text-slate-500 uppercase text-[10px] tracking-wide">{metric.label}</p>
                    <p className="font-bold text-base mt-0.5">{metric.value}</p>
                </div>
            ))}
        </div>
      )}

      {/* Dense Table */}
      <div className="mb-6">
        <table className="w-full text-xs border-collapse">
            <thead>
                <tr className="border-y bg-slate-50">
                    {data.tableHeaders.map((header, i) => (
                        <th key={i} className="px-2 py-1.5 text-left font-semibold text-slate-700">{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="text-slate-600">
                {data.tableRows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                        {row.map((cell, j) => (
                            <td key={j} className="px-2 py-1.5">{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Minimal Footer */}
      <div className="text-center text-[10px] text-slate-400 mt-8 pt-3 border-t">
          <p>{data.companyInfo.name} • {data.companyInfo.phone} • {format(data.generatedAt, 'PPP')}</p>
      </div>
    </div>
  );
}
