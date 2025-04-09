"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchReposWithIssuesParams } from "@/lib/github/search"
import { IssueOrderFieldSchema } from "@/lib/types/github"
import { cn } from "@/lib/utils/utils-common"

const formSchema = z
  .object({
    language: z.string().optional(),
    issueLabel: z.string().optional(),
    state: z.enum(["OPEN", "CLOSED"]).default("OPEN"),
    createdAfter: z.string().optional(),
    minStars: z.number().optional(),
    maxStars: z.number().optional(),
    sort: IssueOrderFieldSchema,
    order: z.enum(["ASC", "DESC"]).default("DESC"),
  })
  .refine(
    (data) => {
      if (data.minStars && data.maxStars) {
        return data.minStars <= data.maxStars
      }
      return true
    },
    {
      message: "Minimum stars must be less than or equal to maximum stars",
      path: ["minStars"],
    }
  )
  .refine(
    (data) => {
      // At least one search criteria must be provided
      return !!(
        data.language ||
        data.issueLabel ||
        data.createdAfter ||
        data.minStars ||
        data.maxStars
      )
    },
    {
      message: "At least one search criteria must be provided",
      path: ["language"],
    }
  )

type FormSchema = z.infer<typeof formSchema>

interface IssueSearchProps {
  onSearch: (params: SearchReposWithIssuesParams) => void
  defaultValues?: Partial<FormSchema>
}

const issueOrderFieldDisplayNames: Record<
  z.infer<typeof IssueOrderFieldSchema>,
  string
> = {
  CREATED: "Created Date",
  UPDATED: "Update Date",
  INTERACTIONS: "Interaction Count",
  REACTIONS: "Reaction Count",
}

export function IssueSearch({ onSearch, defaultValues }: IssueSearchProps) {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: defaultValues?.language || "",
      issueLabel: defaultValues?.issueLabel || "",
      state: defaultValues?.state || "OPEN",
      createdAfter: defaultValues?.createdAfter || "",
      minStars: defaultValues?.minStars,
      maxStars: defaultValues?.maxStars,
      sort: defaultValues?.sort || "CREATED",
      order: defaultValues?.order || "DESC",
    },
  })

  function onSubmit(values: FormSchema) {
    // Filter out empty string values
    const cleanedValues = Object.fromEntries(
      Object.entries(values).filter(([_, value]) => value !== "")
    )

    onSearch({
      ...cleanedValues,
      state: values.state,
      sort: values.sort,
      order: values.order,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Language (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="typescript" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="issueLabel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issue Label (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="bug" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select issue state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="createdAfter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Created After (optional)</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) =>
                            field.onChange(
                              date ? date.toISOString().split("T")[0] : ""
                            )
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => field.onChange("")}
                      className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                    >
                      &times;
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minStars"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel>Minimum Repository Stars (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    value={value ?? ""}
                    onChange={(e) =>
                      onChange(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxStars"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel>Maximum Repository Stars (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={value ?? ""}
                    onChange={(e) =>
                      onChange(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sort By</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sort field" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(issueOrderFieldDisplayNames).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select order direction" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DESC">Descending</SelectItem>
                    <SelectItem value="ASC">Ascending</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full">
          Search Issues
        </Button>
      </form>
    </Form>
  )
}
