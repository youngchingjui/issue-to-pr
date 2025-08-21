"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import ApiKeyInput from "@/components/settings/APIKeyInput"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  initialKey?: string
}

const OpenAIApiKeyCardClient = ({ initialKey = "" }: Props) => {
  const [visible, setVisible] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>OpenAI API Key</CardTitle>
            </CardHeader>
            <CardContent>
              {!isSuccess ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-1">
                    Set your OpenAI API key to run the agents. You can create an
                    API key {""}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-600"
                    >
                      here
                    </a>
                    , then paste it below.
                  </p>
                  <ApiKeyInput
                    initialKey={initialKey}
                    onVerified={() => setIsSuccess(true)}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="text-sm">
                      API key was successfully saved and verified.
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    You can update your API key anytime in settings.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setVisible(false)}>Dismiss</Button>
                    <Button variant="secondary" asChild>
                      <Link href="/settings">Go to Settings</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default OpenAIApiKeyCardClient
