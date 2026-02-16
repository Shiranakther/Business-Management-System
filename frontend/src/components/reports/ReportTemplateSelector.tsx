import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ReportTemplateType = 'modern' | 'classic' | 'minimal';

interface ReportTemplateSelectorProps {
  selectedTemplate: ReportTemplateType;
  onSelect: (template: ReportTemplateType) => void;
}

export function ReportTemplateSelector({ selectedTemplate, onSelect }: ReportTemplateSelectorProps) {
  
  const templates = [
    {
      id: 'modern' as const,
      name: 'Modern One',
      description: 'Clean, spacious design with accent colors and card-based metrics.',
      previewColor: 'bg-indigo-50 border-indigo-200'
    },
    {
      id: 'classic' as const,
      name: 'Corporate Classic',
      description: 'Traditional, serif-font based layout suitable for formal documentation.',
      previewColor: 'bg-slate-50 border-slate-300'
    },
    {
      id: 'minimal' as const,
      name: 'Data Minimal',
      description: 'Focus purely on data with minimal styling and maximum density.',
      previewColor: 'bg-white border-gray-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
       {templates.map(t => (
          <div 
             key={t.id}
             className={cn(
                "relative cursor-pointer group rounded-xl border-2 transition-all p-4 hover:border-primary/50",
                selectedTemplate === t.id ? "border-primary bg-primary/5" : "border-border bg-card"
             )}
             onClick={() => onSelect(t.id)}
          >
             {selectedTemplate === t.id && (
                <div className="absolute top-2 right-2 p-1 bg-primary text-primary-foreground rounded-full">
                    <Check className="w-3 h-3" />
                </div>
             )}
             
             {/* Abstract Mini Preview */}
             <div className={cn("w-full h-32 mb-4 rounded-md border text-[8px] p-2 overflow-hidden select-none", t.previewColor)}>
                {/* Header Mockup */}
                <div className="flex justify-between mb-2">
                    <div className="w-1/3 h-2 bg-current opacity-20 rounded" />
                    <div className="w-1/4 h-2 bg-current opacity-20 rounded" />
                </div>
                {/* Metrics Mockup */}
                <div className="flex gap-2 mb-2">
                    <div className="w-1/3 h-8 bg-current opacity-10 rounded" />
                    <div className="w-1/3 h-8 bg-current opacity-10 rounded" />
                    <div className="w-1/3 h-8 bg-current opacity-10 rounded" />
                </div>
                 {/* Table Mockup */}
                 <div className="space-y-1">
                     <div className="w-full h-2 bg-current opacity-20 rounded" />
                     <div className="w-full h-1 bg-current opacity-10 rounded" />
                     <div className="w-full h-1 bg-current opacity-10 rounded" />
                     <div className="w-full h-1 bg-current opacity-10 rounded" />
                 </div>
             </div>

             <h3 className="font-semibold text-sm">{t.name}</h3>
             <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
          </div>
       ))}
    </div>
  );
}
