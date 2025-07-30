"use client"

import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { AnyEvent } from "@/lib/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

interface Props {
  event: AnyEvent | null
  onOpenChange: (open: boolean) => void
}

export default function EventDetailDrawer({ event, onOpenChange }: Props) {
  const isMobile = useMediaQuery("max-sm")

  return (
    <Sheet open={!!event} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? "bottom" : "right"} className="sm:max-w-md w-full">
        <SheetHeader>
          <SheetTitle>Event Details</SheetTitle>
          {event && (
            <SheetDescription>
              <span className="font-mono text-xs text-muted-foreground">{event.type}</span>
            </SheetDescription>
          )}
        </SheetHeader>
        <ScrollArea className="h-full pr-4 mt-4">
          {event ? (
            <pre className="text-xs whitespace-pre-wrap break-all">
              {JSON.stringify(event, null, 2)}
            </pre>
          ) : (
            <div className="text-center text-sm text-muted-foreground">No event selected</div>
          )}
        </ScrollArea>
        <div className="mt-4 flex justify-end">
          <SheetClose asChild>
            <Button variant="secondary" size="sm">
              Close
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}

