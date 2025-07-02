"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ContainerEnvironmentManager from "./ContainerEnvironmentManager"

interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export default function AgentWorkflowClient() {
  const fakeRepos = ["repo-1", "repo-2", "repo-3"]
  const fakeBranches = ["main", "dev", "feature"]
  const fakeTools = ["Git", "Code Search", "Unit Test"]

  const [selectedRepo, setSelectedRepo] = useState(fakeRepos[0])
  const [selectedBranch, setSelectedBranch] = useState(fakeBranches[0])
  const [issueText, setIssueText] = useState("")

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [newMessageRole, setNewMessageRole] = useState<"system" | "user">(
    "user"
  )

  const [selectedTools, setSelectedTools] = useState<string[]>([])

  const addMessage = () => {
    if (!newMessage.trim()) return
    const msg: Message = { role: newMessageRole, content: newMessage.trim() }
    const assistantReply: Message = {
      role: "assistant",
      content: `Fake response to "${newMessage.trim()}"`,
    }
    setMessages((prev) => [...prev, msg, assistantReply])
    setNewMessage("")
  }

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    )
  }

  return (
    <div className="container mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold">Agent Workflow Builder</h1>
        <p className="mt-2 text-gray-600">
          Configure options and messages for your agent workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Repository and Branch Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Repository Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="mb-2 text-sm font-medium">Repository</p>
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fakeRepos.map((repo) => (
                      <SelectItem key={repo} value={repo}>
                        {repo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Branch</p>
                <Select
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fakeBranches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issue Input */}
        <Card>
          <CardHeader>
            <CardTitle>Issue</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder="Describe the issue or paste issue text here..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="mb-2 text-sm font-medium">Role</p>
                <Select
                  value={newMessageRole}
                  onValueChange={(val) =>
                    setNewMessageRole(val as "system" | "user")
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="mb-2 text-sm font-medium">Message</p>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Enter message"
                />
              </div>
              <Button type="button" onClick={addMessage} className="self-start">
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {messages.map((m, i) => (
                <div key={i} className="rounded border p-3">
                  <div className="text-sm font-semibold capitalize">
                    {m.role}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {m.content}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No messages yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {fakeTools.map((tool) => (
              <label key={tool} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedTools.includes(tool)}
                  onCheckedChange={() => toggleTool(tool)}
                  id={`tool-${tool}`}
                />
                <span>{tool}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <ContainerEnvironmentManager />
      </div>
    </div>
  )
}
