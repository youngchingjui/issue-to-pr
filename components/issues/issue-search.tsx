"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchReposWithIssuesParams } from "@/lib/github/search"

const formSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  language: z.string().min(1, "Language is required"),
  issueLabel: z.string().min(1, "Issue label is required"),
  state: z.enum(["OPEN", "CLOSED"]).default("OPEN"),
  createdAfter: z.string().optional(),
})

type FormSchema = z.infer<typeof formSchema>

interface IssueSearchProps {
  onSearch: (params: SearchReposWithIssuesParams) => void
  defaultValues?: Partial<FormSchema>
}

export function IssueSearch({ onSearch, defaultValues }: IssueSearchProps) {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: defaultValues?.topic || "",
      language: defaultValues?.language || "",
      issueLabel: defaultValues?.issueLabel || "",
      state: defaultValues?.state || "OPEN",
      createdAfter: defaultValues?.createdAfter || "",
    },
  })

  function onSubmit(values: FormSchema) {
    onSearch({
      ...values,
      state: values.state,
      sort: "UPDATED_AT",
      order: "DESC",
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Topic</FormLabel>
                <FormControl>
                  <Input placeholder="nextjs" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Language</FormLabel>
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
                <FormLabel>Issue Label</FormLabel>
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
                <FormLabel>Created After</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
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
