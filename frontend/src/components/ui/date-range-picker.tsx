import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type DateRangePreset = "all" | "today" | "last24h" | "last7days" | "last30days" | "thisMonth" | "lastMonth" | "custom";

interface DateRangePickerProps {
  value: DateRangePreset;
  customRange?: { from: Date | undefined; to: Date | undefined };
  onValueChange: (value: DateRangePreset) => void;
  onCustomRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
  className?: string;
  align?: "start" | "center" | "end";
  showSelectedTag?: boolean;
}

// Helper functions (omitted for brevity, assume they are handled or untouched if I don't replace them? No, to be safe I must replicate if inside the range or ensure context. 
// Wait, I can target just the interface and function start.

// Helper functions
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 16 }, (_, i) => currentYear - 10 + i);
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

export function DateRangePicker({
  value,
  customRange,
  onValueChange,
  onCustomRangeChange,
  className,
  align = "start",
  showSelectedTag = true,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Start date state
  const [startYear, setStartYear] = React.useState<number | undefined>(customRange?.from?.getFullYear());
  const [startMonth, setStartMonth] = React.useState<number | undefined>(customRange?.from?.getMonth());
  const [startDay, setStartDay] = React.useState<number | undefined>(customRange?.from?.getDate());
  
  // End date state
  const [endYear, setEndYear] = React.useState<number | undefined>(customRange?.to?.getFullYear());
  const [endMonth, setEndMonth] = React.useState<number | undefined>(customRange?.to?.getMonth());
  const [endDay, setEndDay] = React.useState<number | undefined>(customRange?.to?.getDate());

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
    onCustomRangeChange?.({ from: undefined, to: undefined });
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

    onCustomRangeChange?.({ from: fromDate, to: toDate });
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset to current customRange values
    setStartYear(customRange?.from?.getFullYear());
    setStartMonth(customRange?.from?.getMonth());
    setStartDay(customRange?.from?.getDate());
    setEndYear(customRange?.to?.getFullYear());
    setEndMonth(customRange?.to?.getMonth());
    setEndDay(customRange?.to?.getDate());
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (value === "custom" && customRange?.from) {
      if (customRange.to) {
        return `${format(customRange.from, "MMM dd, yyyy")} - ${format(customRange.to, "MMM dd, yyyy")}`;
      }
      return format(customRange.from, "MMM dd, yyyy");
    }
    return null;
  };

  const displayText = getDisplayText();
  const isStartDateValid = startYear !== undefined && startMonth !== undefined && startDay !== undefined;
  const isEndDateValid = endYear !== undefined && endMonth !== undefined && endDay !== undefined;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col sm:flex-row gap-2">
        <Select
          value={value}
          onValueChange={(val: DateRangePreset) => {
            onValueChange(val);
            if (val !== "custom") {
              // Reset custom range when switching to a preset
              onCustomRangeChange?.({ from: undefined, to: undefined });
              setStartYear(undefined);
              setStartMonth(undefined);
              setStartDay(undefined);
              setEndYear(undefined);
              setEndMonth(undefined);
              setEndDay(undefined);
            }
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px] cursor-pointer">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent 
            className="max-h-[300px]" 
            position="popper" 
            align="start"
            sideOffset={4}
          >
            <SelectItem value="all" className="cursor-pointer">All Time</SelectItem>
            <SelectItem value="today" className="cursor-pointer">Today</SelectItem>
            <SelectItem value="last24h" className="cursor-pointer">Last 24 Hours</SelectItem>
            <SelectItem value="last7days" className="cursor-pointer">Last 7 Days</SelectItem>
            <SelectItem value="last30days" className="cursor-pointer">Last 30 Days</SelectItem>
            <SelectItem value="thisMonth" className="cursor-pointer">This Month</SelectItem>
            <SelectItem value="lastMonth" className="cursor-pointer">Last Month</SelectItem>
            <SelectItem value="custom" className="cursor-pointer">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {value === "custom" && (
          <div className="flex gap-2 flex-1">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal flex-1 min-w-[260px]",
                    !customRange?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {displayText || "Pick a date range"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align={align} side="bottom">
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
            {customRange?.from && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Active filter display */}
      {showSelectedTag && value !== "all" && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="font-medium">
              {value === "custom" && displayText
                ? displayText
                : value === "today"
                ? "Today"
                : value === "last24h"
                ? "Last 24 Hours"
                : value === "last7days"
                ? "Last 7 Days"
                : value === "last30days"
                ? "Last 30 Days"
                : value === "thisMonth"
                ? "This Month"
                : value === "lastMonth"
                ? "Last Month"
                : ""}
            </span>
            <button
              onClick={() => {
                onValueChange("all");
                handleClear();
              }}
              className="hover:bg-primary/20 rounded-sm p-0.5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
