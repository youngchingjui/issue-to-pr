"use client"

import { CopyIcon } from "@radix-ui/react-icons"

import { Button } from "@/components/ui/button"
import { toast } from "@/lib/hooks/use-toast"

interface CopyMarkdownButtonProps {
  content: string
}

export function CopyMarkdownButton({ content }: CopyMarkdownButtonProps) {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        description: "Copied to clipboard",
        duration: 2000,
      })
    } catch (err) {
      toast({
        description: `Failed to copy to clipboard: ${err}`,
        variant: "destructive",
        duration: 2000,
      })
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={copyToClipboard}
      title="Copy raw markdown"
    >
      <CopyIcon className="h-4 w-4" />
    </Button>
  )
}
