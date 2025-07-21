"use server"

import { addRoleToUser as addRoleRepo, removeRoleFromUser as removeRoleRepo, getUserRoles as getUserRolesRepo } from "@/lib/neo4j/services/user"

/**
 * Server action: Fetch roles associated with a username.
 * Returns { status: "ok", roles } or { status: "error", message }.
 */
export async function getUserRolesAction(username: string): Promise<
  | { status: "ok"; roles: string[] }
  | { status: "error"; message: string }
> {
  try {
    if (!username.trim()) throw new Error("Username is required")
    const roles = await getUserRolesRepo(username.trim())
    return { status: "ok", roles }
  } catch (err: any) {
    return { status: "error", message: err?.message ?? "Failed to fetch roles" }
  }
}

/**
 * Server action: Add role to user.
 */
export async function addRoleAction(params: {
  username: string
  role: string
}): Promise<{ status: "ok"; roles: string[] } | { status: "error"; message: string }> {
  try {
    const { username, role } = params
    if (!username.trim() || !role.trim())
      throw new Error("Username and role are required")
    const roles = await addRoleRepo(username.trim(), role.trim())
    return { status: "ok", roles }
  } catch (err: any) {
    return { status: "error", message: err?.message ?? "Failed to add role" }
  }
}

/**
 * Server action: Remove role from user.
 */
export async function removeRoleAction(params: {
  username: string
  role: string
}): Promise<{ status: "ok"; roles: string[] } | { status: "error"; message: string }> {
  try {
    const { username, role } = params
    if (!username.trim() || !role.trim())
      throw new Error("Username and role are required")
    const roles = await removeRoleRepo(username.trim(), role.trim())
    return { status: "ok", roles }
  } catch (err: any) {
    return { status: "error", message: err?.message ?? "Failed to remove role" }
  }
}

