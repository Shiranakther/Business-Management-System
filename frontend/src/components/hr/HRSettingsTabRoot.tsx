import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Clock, CalendarHeart } from 'lucide-react';
import { PayrollSettingsPanel } from './PayrollSettingsPanel';
import { ShiftManagementPanel } from './ShiftManagementPanel';
import { SpecialDaysPanel } from './SpecialDaysPanel';

export function HRSettingsTabRoot() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="payroll_rules" className="w-full">
        <TabsList className="mb-4">
            <TabsTrigger value="payroll_rules" className="gap-2">
                <Settings className="w-4 h-4" />
                Payroll & Rules
            </TabsTrigger>
            <TabsTrigger value="shifts" className="gap-2">
                <Clock className="w-4 h-4" />
                Shifts
            </TabsTrigger>
            <TabsTrigger value="special_days" className="gap-2">
                <CalendarHeart className="w-4 h-4" />
                Special Days & Holidays
            </TabsTrigger>
        </TabsList>
        
        <TabsContent value="payroll_rules" className="mt-0">
            <PayrollSettingsPanel />
        </TabsContent>
        
        <TabsContent value="shifts" className="mt-0">
            <ShiftManagementPanel />
        </TabsContent>

        <TabsContent value="special_days" className="mt-0">
            <SpecialDaysPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
