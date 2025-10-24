"use client"

import { Check, ChevronDown, Loader2, Search } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils/utils-common"

export interface DropdownOption {
  value: string
  label: string
}

interface SearchableDropdownProps {
  options?: DropdownOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  isLoading?: boolean
  className?: string
  disabled?: boolean
}

export function SearchableDropdown({
  options = [],
  value,
  onValueChange,
  placeholder = "Select an option...",
  isLoading = false,
  className,
  disabled = false,
}: SearchableDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Auto-focus search input when dropdown opens
  React.useEffect(() => {
    if (open && searchInputRef.current) {
      // Small delay to ensure popover is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 0)
    } else {
      // Clear search when dropdown closes
      setSearchQuery("")
    }
  }, [open])

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [options, searchQuery])

  // Find selected option label
  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-background hover:bg-muted/50 transition-colors",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled || isLoading}
        >
          <span className="truncate">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : selectedOption ? (
              selectedOption.label
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <div className="flex flex-col">
          {/* Search Bar */}
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 bg-background border-input"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Loading options...
                </p>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No results found." : "No options available."}
                </p>
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onValueChange?.(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:bg-accent focus-visible:text-accent-foreground",
                      value === option.value && "bg-accent/50"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
