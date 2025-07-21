"use client"

import { useState, useTransition } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addRoleToUser,
  getUserRoles,
  removeRoleFromUser,
} from "@/lib/neo4j/services/user"

export default function UserRolesCard() {
  const [username, setUsername] = useState("")
  const [newRole, setNewRole] = useState("")
  const [roles, setRoles] = useState<string[]>([])
  const [userFound, setUserFound] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleLookupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedUsername = username.trim()
    setRoles([]) // Always clear roles before lookup
    setUserFound(false) // Hide add role form until lookup completes
    setNewRole("") // Reset add role field on lookup
    setErrorMsg(null)
    if (!trimmedUsername) {
      return
    }
    startTransition(async () => {
      try {
        const roles = await getUserRoles(trimmedUsername)
        setRoles(roles)
        setUserFound(true)
        setErrorMsg(null)
      } catch (err) {
        setRoles([])
        setUserFound(false)
        setErrorMsg(String(err))
      }
    })
  }

  const handleAddRoleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newRole.trim()) return
    startTransition(async () => {
      try {
        const roles = await addRoleToUser(username, newRole.trim())
        setRoles(roles)
        setNewRole("")
        setErrorMsg(null)
      } catch (err) {
        setErrorMsg(String(err))
      }
    })
  }

  const handleRemoveRole = (role: string) => {
    startTransition(async () => {
      try {
        const roles = await removeRoleFromUser(username, role)
        setRoles(roles)
        setErrorMsg(null)
      } catch (err) {
        setErrorMsg(String(err))
      }
    })
  }
  return (
    <Card className="max-w-2xl w-full mx-auto mb-4 bg-white/70 border border-dashed border-slate-300 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">User Role Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label
              htmlFor="githubName"
              className="text-sm font-medium text-muted-foreground"
            >
              GitHub Username
            </Label>
            <form
              className="flex items-center space-x-2 mt-1"
              onSubmit={handleLookupSubmit}
            >
              <Input
                id="githubName"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="octocat"
                disabled={isPending}
              />
              <Button
                type="submit"
                disabled={isPending || !username.trim()}
                variant="outline"
              >
                Lookup
              </Button>
            </form>
          </div>

          {roles.length > 0 && (
            <div className="space-x-2 flex flex-wrap">
              {roles.map((role) => (
                <Badge key={role} variant="secondary" className="mb-1">
                  <span className="mr-1">{role}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role)}
                    disabled={isPending}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {userFound && (
            <form
              className="flex items-end space-x-2"
              onSubmit={handleAddRoleSubmit}
            >
              <div className="flex-1">
                <Label
                  htmlFor="roleInput"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Add Role
                </Label>
                <Input
                  id="roleInput"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="admin"
                  disabled={isPending}
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={isPending || !newRole.trim()}>
                Add
              </Button>
            </form>
          )}

          {errorMsg && (
            <div className="mt-2 p-3 bg-red-50 text-sm text-red-600 rounded border border-red-200 break-words">
              {errorMsg}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
