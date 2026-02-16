import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ReportDateRangePickerProps {
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

// Helper functions
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
const months = [
  { value: 0, label: "January" },
  { value: 1, label: "February" },
  { value: 2, label: "March" },
  { value: 3, label: "April" },
  { value: 4, label: "May" },
  { value: 5, label: "June" },
  { value: 6, label: "July" },
  { value: 7, label: "August" },
  { value: 8, label: "September" },
  { value: 9, label: "October" },
  { value: 10, label: "November" },
  { value: 11, label: "December" },
];

export function ReportDateRangePicker({ dateRange, onDateRangeChange }: ReportDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Start date state
  const [startYear, setStartYear] = useState<number | undefined>(dateRange.from?.getFullYear());
  const [startMonth, setStartMonth] = useState<number | undefined>(dateRange.from?.getMonth());
  const [startDay, setStartDay] = useState<number | undefined>(dateRange.from?.getDate());
  
  // End date state
  const [endYear, setEndYear] = useState<number | undefined>(dateRange.to?.getFullYear());
  const [endMonth, setEndMonth] = useState<number | undefined>(dateRange.to?.getMonth());
  const [endDay, setEndDay] = useState<number | undefined>(dateRange.to?.getDate());

  // Calculate available days based on selected month/year
  const startDaysInMonth = startYear && startMonth !== undefined ? getDaysInMonth(startYear, startMonth) : 31;
  const endDaysInMonth = endYear && endMonth !== undefined ? getDaysInMonth(endYear, endMonth) : 31;

  const handleClear = () => {
    setStartYear(undefined);
    setStartMonth(undefined);
    setStartDay(undefined);
    setEndYear(undefined);
    setEndMonth(undefined);
    setEndDay(undefined);
    onDateRangeChange({ from: undefined, to: undefined });
  };

  const handleConfirm = () => {
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (startYear !== undefined && startMonth !== undefined && startDay !== undefined) {
      fromDate = new Date(startYear, startMonth, startDay);
    }

    if (endYear !== undefined && endMonth !== undefined && endDay !== undefined) {
      toDate = new Date(endYear, endMonth, endDay);
    }

    onDateRangeChange({ from: fromDate, to: toDate });
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset to current dateRange values
    setStartYear(dateRange.from?.getFullYear());
    setStartMonth(dateRange.from?.getMonth());
    setStartDay(dateRange.from?.getDate());
    setEndYear(dateRange.to?.getFullYear());
    setEndMonth(dateRange.to?.getMonth());
    setEndDay(dateRange.to?.getDate());
    setIsOpen(false);
  };

  const displayText = dateRange.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
      : format(dateRange.from, "MMM dd, yyyy")
    : null;

  const isStartDateValid = startYear !== undefined && startMonth !== undefined && startDay !== undefined;
  const isEndDateValid = endYear !== undefined && endMonth !== undefined && endDay !== undefined;

  return (
    <div className="flex gap-2 items-center">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !dateRange.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText || "Select date range"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 z-[100]" align="start">
          <div className="space-y-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Start Date</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={startYear?.toString()} onValueChange={(v) => setStartYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={startMonth?.toString()} onValueChange={(v) => setStartMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label.slice(0, 3)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={startDay?.toString()} onValueChange={(v) => setStartDay(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: startDaysInMonth }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">End Date</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={endYear?.toString()} onValueChange={(v) => setEndYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={endMonth?.toString()} onValueChange={(v) => setEndMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label.slice(0, 3)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={endDay?.toString()} onValueChange={(v) => setEndDay(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: endDaysInMonth }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {isStartDateValid && isEndDateValid ? (
                  <span className="text-success">Range selected</span>
                ) : isStartDateValid ? (
                  <span className="text-warning">Select end date</span>
                ) : (
                  <span>Select start date</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={!isStartDateValid && !isEndDateValid}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirm}
                  disabled={!isStartDateValid}
                  className="h-7 text-xs"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {dateRange.from && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
