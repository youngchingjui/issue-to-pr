"use client"

import { FolderCheck, Loader2 } from "lucide-react"
import { useEffect, useState, useTransition } from "react"

import ContainerEnvironmentManager from "@/components/playground/ContainerEnvironmentManager"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { checkLocalRepoExists, getRepositoryIssues } from "@/lib/actions/github"
import { getChatCompletion } from "@/lib/actions/openaiChat"
import { listBranchesSortedByCommitDate } from "@/lib/github/refs"
import { listUserAppRepositories } from "@/lib/github/repos"
import { toast } from "@/lib/hooks/use-toast"
import {
  DEFAULT_SYSTEM_PROMPTS,
  SystemPromptTemplate,
} from "@/lib/systemPrompts"
import {
  AuthenticatedUserRepository,
  repoFullNameSchema,
} from "@/lib/types/github"
import { GitHubIssue } from "@/lib/types/github"

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

  const [repos, setRepos] = useState<AuthenticatedUserRepository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string>("")
  const [branches, setBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>("")
  const [issues, setIssues] = useState<GitHubIssue[]>([])
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startCompletion] = useTransition()
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<{ runId: string } | null>(null)
  const [localRepoStatus, setLocalRepoStatus] = useState<{
    exists: boolean
    path: string
  } | null>(null)

  // Load repositories on mount
  useEffect(() => {
    const loadRepos = async () => {
      const r = await listUserAppRepositories()
      setRepos(r)
    }
    loadRepos()
  }, [])

  // Fetch branches and issues when a repo is selected
  useEffect(() => {
    if (!selectedRepo) {
      setBranches([])
      setSelectedBranch("")
      setIssues([])
      setSelectedIssue("")
      setLocalRepoStatus(null)
      return
    }
    setLoadingRepoData(true)
    const loadData = async () => {
      const [br, is, local] = await Promise.all([
        (
          await listBranchesSortedByCommitDate(
            repoFullNameSchema.parse(selectedRepo)
          )
        ).map((b) => b.name),
        getRepositoryIssues(selectedRepo),
        checkLocalRepoExists(selectedRepo),
      ])
      setBranches(br)
      setIssues(is)
      setLocalRepoStatus(local)
      setLoadingRepoData(false)
    }
    loadData()
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

  const submitMessages = async () => {
    if (isSubmitting || isPending) return
    setIsSubmitting(true)
    startCompletion(async () => {
      try {
        const resp = await getChatCompletion({
          systemPrompt: messages[0].content,
          userPrompt: messages[1].content,
        })
        setMessages((prev) => [...prev, { role: "assistant", content: resp }])
      } finally {
        setIsSubmitting(false)
      }
    })
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

  const copyLocalPath = async () => {
    if (!localRepoStatus?.path) return
    try {
      await navigator.clipboard.writeText(localRepoStatus.path)
      toast({ description: "Copied path to clipboard", duration: 2000 })
    } catch (err) {
      toast({
        description: `Failed to copy: ${err}`,
        variant: "destructive",
        duration: 2000,
      })
    }
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
                <div className="flex items-center gap-2">
                  <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select repo" />
                    </SelectTrigger>
                    <SelectContent>
                      {repos.map((repo) => (
                        <SelectItem key={repo.full_name} value={repo.full_name}>
                          {repo.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {localRepoStatus?.exists && (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={copyLocalPath}
                          >
                            <FolderCheck className="h-4 w-4 text-green-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-center">
                          <div className="text-sm">Repo saved locally.</div>
                          {localRepoStatus?.path && (
                            <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                              {localRepoStatus.path}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground">
                            Click to copy path
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
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
                      <SelectItem
                        key={issue.id}
                        value={issue.number.toString()}
                      >
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
              <Button
                type="button"
                onClick={submitMessages}
                className="self-start"
                disabled={isSubmitting || isPending}
              >
                {isSubmitting || isPending ? "Submitting..." : "Submit"}
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

        <ContainerEnvironmentManager selectedRepo={selectedRepo} />
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
