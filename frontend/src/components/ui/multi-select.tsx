import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type Option = {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const handleRemove = (value: string) => {
      onChange(selected.filter((item) => item !== value))
  }

  const handleSelectAll = () => {
      if (selected.length === options.length) {
          onChange([])
      } else {
          onChange(options.map(o => o.value))
      }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-10", className, selected.length > 0 ? "h-auto" : "h-10")}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {selected.length > 0 && selected.length <= 3 && (
                selected.map((value) => {
                    const label = options.find((option) => option.value === value)?.label || value
                    return (
                        <Badge key={value} variant="secondary" className="mr-1 mb-1"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(value);
                            }}
                        >
                            {label}
                            <div
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleRemove(value)
                                }
                                }}
                                onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                }}
                                onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleRemove(value)
                                }}
                            >
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </div>
                        </Badge>
                    )
                })
            )}
            {selected.length > 3 && (
                <Badge variant="secondary" className="mr-1">
                    {selected.length} selected
                </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
                <CommandItem
                  onSelect={handleSelectAll}
                  className="cursor-pointer font-medium"
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selected.length === options.length
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className={cn("h-4 w-4")} />
                  </div>
                  <span>Select All</span>
                </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Use label for search? Or value? Command filters by value usually. But we want search by label.
                                       // CommandItem `value` prop is used for filtering. If we put label here, search works on label.
                  onSelect={() => handleSelect(option.value)}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selected.includes(option.value)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className={cn("h-4 w-4")} />
                  </div>
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
