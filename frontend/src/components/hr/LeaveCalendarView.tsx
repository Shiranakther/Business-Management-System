import { useState } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, 
  isWithinInterval, startOfDay, endOfDay 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaveRequest } from '@/types';
import { cn } from '@/lib/utils';

interface LeaveCalendarViewProps {
  leaveRequests: LeaveRequest[];
}

export function LeaveCalendarView({ leaveRequests }: LeaveCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Leave Calendar</CardTitle>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium text-center min-w-[140px]">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {weekDays.map(day => (
            <div key={day} className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          {daysInMonth.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isDayToday = isToday(day);
            const dayLeaves = leaveRequests.filter(req => 
              req.status !== 'REJECTED' && 
              isWithinInterval(startOfDay(day), { 
                start: startOfDay(req.startDate), 
                end: endOfDay(req.endDate) 
              })
            );
            return (
              <div 
                key={day.toString() + idx} 
                className={cn(
                  "min-h-[100px] bg-card p-1.5 border-t border-border flex flex-col gap-1 transition-colors", 
                  !isCurrentMonth && "bg-muted/30 text-muted-foreground", 
                  isDayToday && "bg-accent/5"
                )}
              >
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full", 
                    isDayToday ? "bg-primary text-primary-foreground" : ""
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[70px] no-scrollbar">
                  {dayLeaves.map(leave => (
                    <div 
                      key={leave.id} 
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded truncate", 
                        leave.status === 'APPROVED' 
                          ? "bg-success/20 text-success-foreground border border-success/30" 
                          : "bg-warning/20 text-warning-foreground border border-warning/30"
                      )} 
                      title={`${leave.employeeName} - ${leave.type} (${leave.status})`}
                    >
                      <span className="font-semibold">{leave.employeeName}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-sm justify-end">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-success/40 border border-success/50"></div>
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-warning/40 border border-warning/50"></div>
              <span>Pending</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
