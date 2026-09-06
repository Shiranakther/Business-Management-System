import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Timer } from 'lucide-react';
import { AttendancePanel } from './AttendancePanel';
import { OvertimePanel } from './OvertimePanel';

export function AttendanceTabRoot() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="mb-4">
            <TabsTrigger value="daily" className="gap-2">
                <Clock className="w-4 h-4" />
                Daily Attendance
            </TabsTrigger>
            <TabsTrigger value="overtime" className="gap-2">
                <Timer className="w-4 h-4" />
                Overtime Approval
            </TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="mt-0">
            <AttendancePanel />
        </TabsContent>
        
        <TabsContent value="overtime" className="mt-0">
            <OvertimePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
