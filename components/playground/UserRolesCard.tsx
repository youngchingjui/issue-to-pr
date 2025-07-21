"use client"

import { useEffect, useState, useTransition } from "react"

import {
  addRoleAction,
  getUserRolesAction,
  removeRoleAction,
} from "@/lib/actions/userRoles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export default function UserRolesCard() {
  const [username, setUsername] = useState("")
  const [newRole, setNewRole] = useState("")
  const [roles, setRoles] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Fetch roles when username changes and not empty
  useEffect(() => {
    if (!username.trim()) {
      setRoles([])
      return
    }
    startTransition(async () => {
      const res = await getUserRolesAction(username.trim())
      if (res.status === "ok") {
        setRoles(res.roles)
        setErrorMsg(null)
      } else {
        setRoles([])
        setErrorMsg(res.message)
      }
    })
  }, [username])

  const handleAddRole = () => {
    if (!newRole.trim()) return
    startTransition(async () => {
      const res = await addRoleAction({ username, role: newRole.trim() })
      if (res.status === "ok") {
        setRoles(res.roles)
        setNewRole("")
        setErrorMsg(null)
      } else {
        setErrorMsg(res.message)
      }
    })
  }

  const handleRemoveRole = (role: string) => {
    startTransition(async () => {
      const res = await removeRoleAction({ username, role })
      if (res.status === "ok") {
        setRoles(res.roles)
        setErrorMsg(null)
      } else {
        setErrorMsg(res.message)
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
            <Label htmlFor="usernameInput" className="text-sm font-medium text-muted-foreground">
              GitHub Username
            </Label>
            <Input
              id="usernameInput"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="octocat"
              disabled={isPending}
              className="mt-1"
            />
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

          {username.trim() && (
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <Label htmlFor="roleInput" className="text-sm font-medium text-muted-foreground">
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
              <Button type="button" onClick={handleAddRole} disabled={isPending || !newRole.trim()}>
                Add
              </Button>
            </div>
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

