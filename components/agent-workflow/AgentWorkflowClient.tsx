"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import ContainerEnvironmentManager from "@/components/agent-workflow/ContainerEnvironmentManager"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  DEFAULT_SYSTEM_PROMPTS,
  SystemPromptTemplate,
} from "@/lib/systemPrompts"

const fakeRepos = ["repo-1", "repo-2", "repo-3"]
const fakeBranches = ["main", "dev", "feature"]
const fakeIssues = [
  { id: "1", title: "Issue 1" },
  { id: "2", title: "Issue 2" },
  { id: "3", title: "Issue 3" },
]

interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export default function AgentWorkflowClient({
  defaultTools,
}: {
  defaultTools: string[]
}) {
  const availableTools = defaultTools

  const [selectedRepo, setSelectedRepo] = useState<string>("")
  const [branches, setBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>("")
  const [issues, setIssues] = useState<typeof fakeIssues>([])
  const [selectedIssue, setSelectedIssue] = useState<string>("")
  const [loadingRepoData, setLoadingRepoData] = useState(false)

  const initialPrompts = DEFAULT_SYSTEM_PROMPTS
  const [promptTemplates, setPromptTemplates] =
    useState<SystemPromptTemplate[]>(initialPrompts)
  const [selectedPromptId, setSelectedPromptId] = useState(initialPrompts[0].id)
  const [isSystemPromptEdited, setIsSystemPromptEdited] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: initialPrompts[0].content },
    { role: "user", content: "" },
  ])
  const [newMessage, setNewMessage] = useState("")
  const [newMessageRole, setNewMessageRole] = useState<"system" | "user">(
    "user"
  )
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<{ runId: string } | null>(null)

  // Fetch branches and issues when a repo is selected
  useEffect(() => {
    if (!selectedRepo) {
      setBranches([])
      setSelectedBranch("")
      setIssues([])
      setSelectedIssue("")
      return
    }
    setLoadingRepoData(true)
    const timer = setTimeout(() => {
      setBranches(fakeBranches)
      setIssues(fakeIssues)
      setLoadingRepoData(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [selectedRepo])

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

  const updateMessage = (index: number, content: string) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, content } : m))
    )
  }

  const onSelectPrompt = (id: string) => {
    setSelectedPromptId(id)
    const template = promptTemplates.find((p) => p.id === id)
    if (template) {
      setMessages((prev) => [
        { ...prev[0], content: template.content },
        prev[1],
      ])
      setIsSystemPromptEdited(false)
    }
  }

  const savePromptAsNew = () => {
    const newTemplate: SystemPromptTemplate = {
      id: `custom-${Date.now()}`,
      label: `Custom ${promptTemplates.length + 1}`,
      content: messages[0].content,
    }
    setPromptTemplates((prev) => [...prev, newTemplate])
    setSelectedPromptId(newTemplate.id)
    setIsSystemPromptEdited(false)
  }

  const updateCurrentPrompt = () => {
    setPromptTemplates((prev) =>
      prev.map((p) =>
        p.id === selectedPromptId ? { ...p, content: messages[0].content } : p
      )
    )
    setIsSystemPromptEdited(false)
  }

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    )
  }

  const startRun = async () => {
    setIsRunning(true)
    setRunResult(null)
    // Fake API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const result = {
      runId: Math.random().toString(36).slice(2, 10),
    }
    setRunResult(result)
    setIsRunning(false)
  }

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Playground</h1>
        <p className="mt-2 text-gray-600">
          Configure options and messages for your agent.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Repository and Branch Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Repo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="mb-2 text-sm font-medium">Repository</p>
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select repo" />
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
              {selectedRepo && (
                <div>
                  <p className="mb-2 text-sm font-medium">Branch</p>
                  <Select
                    value={selectedBranch}
                    onValueChange={setSelectedBranch}
                    disabled={loadingRepoData}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingRepoData && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Loading...
                    </p>
                  )}
                </div>
              )}
            </div>
            {selectedRepo && (
              <div>
                <p className="mb-2 text-sm font-medium">Issue</p>
                <Select
                  value={selectedIssue}
                  onValueChange={setSelectedIssue}
                  disabled={loadingRepoData}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select issue" />
                  </SelectTrigger>
                  <SelectContent>
                    {issues.map((issue) => (
                      <SelectItem key={issue.id} value={issue.id}>
                        {issue.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingRepoData && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Loading...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">System Prompt</p>
              <Select value={selectedPromptId} onValueChange={onSelectPrompt}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {promptTemplates.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                className="mt-2"
                value={messages[0].content}
                onChange={(e) => {
                  updateMessage(0, e.target.value)
                  const template = promptTemplates.find(
                    (t) => t.id === selectedPromptId
                  )
                  setIsSystemPromptEdited(
                    template ? e.target.value !== template.content : true
                  )
                }}
                rows={8}
              />
              {isSystemPromptEdited && (
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <span className="font-medium">Edited</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={updateCurrentPrompt}
                  >
                    Update Template
                  </Button>
                  <Button size="sm" onClick={savePromptAsNew}>
                    Save as New
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">User Prompt</p>
              <Textarea
                value={messages[1].content}
                onChange={(e) => updateMessage(1, e.target.value)}
                placeholder="Enter user prompt"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              {messages.slice(2).map((m, i) => (
                <div key={i} className="rounded border p-3">
                  <div className="text-sm font-semibold capitalize">
                    {m.role}
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

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
          </CardContent>
        </Card>

        {/* Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableTools.map((tool) => (
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
      <div className="flex justify-end">
        <Button onClick={startRun} disabled={isRunning}>
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...
            </>
          ) : (
            "Start Run"
          )}
        </Button>
      </div>
      {runResult && (
        <div className="text-green-700 text-sm mt-2">
          Fake run started with ID {runResult.runId}
        </div>
      )}
    </>
  )
}
