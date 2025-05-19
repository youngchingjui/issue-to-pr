"use client"

import { useState } from "react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      setOpen(false)
      setSubmitted(false)
      setFeedback("")
    }, 1200)
  }

  const handleCancel = () => {
    setOpen(false)
    setFeedback("")
    setSubmitted(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          Feedback
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        {submitted ? (
          <div className="text-center py-2">Thank you for your feedback!</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Let us know what you think..."
              rows={3}
              required
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!feedback.trim()}>
                Submit
              </Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  )
}
