import type { ReportTemplateProps } from './types.ts';
import { format } from 'date-fns';

export function ClassicTemplate({ data }: ReportTemplateProps) {
  return (
    <div className="w-full bg-white text-black p-10 font-serif" id="report-content">
      {/* Header */}
      <div className="text-center mb-10 pb-6 border-b-2 border-black">
         <h1 className="text-4xl font-bold uppercase tracking-widest mb-2">{data.companyInfo.name}</h1>
         <p className="text-sm">{data.companyInfo.address} • {data.companyInfo.phone}</p>
      </div>

      <div className="flex justify-between items-end mb-8">
         <div>
            <h2 className="text-2xl font-bold uppercase underline decoration-1 underline-offset-4">{data.title}</h2>
            <p className="mt-1 italic">{data.subTitle}</p>
         </div>
         <div className="text-right text-sm">
            <p><strong>Date:</strong> {format(data.generatedAt, 'MMMM dd, yyyy')}</p>
            <p><strong>Prepared By:</strong> {data.generatedBy}</p>
         </div>
      </div>

      {/* Metrics Summary */}
      {data.metrics.length > 0 && (
          <div className="mb-8 border border-black p-6">
              <h3 className="font-bold border-b border-black mb-4 inline-block pb-1">EXECUTIVE SUMMARY</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  {data.metrics.map((metric, i) => (
                      <div key={i}>
                          <p className="text-xs uppercase font-bold tracking-wider">{metric.label}</p>
                          <p className="text-xl mt-1">{metric.value}</p>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Table */}
      <div className="mb-10">
          <table className="w-full text-sm border-collapse">
              <thead>
                  <tr className="border-y-2 border-black">
                      {data.tableHeaders.map((header, i) => (
                          <th key={i} className="px-2 py-2 text-left bg-gray-100 font-bold uppercase">{header}</th>
                      ))}
                  </tr>
              </thead>
              <tbody>
                  {data.tableRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-300">
                          {row.map((cell, j) => (
                              <td key={j} className="px-2 py-2">{cell}</td>
                          ))}
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-black text-center text-xs">
          <p>{data.footerText}</p>
          <p className="italic mt-1">~ End of Report ~</p>
      </div>
    </div>
  );
}
