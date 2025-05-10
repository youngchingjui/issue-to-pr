import { redis } from "@/lib/redis"

const AUTO_POST_PLAN_KEY_PREFIX = "settings:autoPostPlan:"

function makeKey(installationId: number): string {
  return `${AUTO_POST_PLAN_KEY_PREFIX}${installationId}`
}

/**
 * Get the auto-post plan setting for a GitHub App installation.
 * Returns `false` (off) by default if there is no value set.
 */
export async function getAutoPostPlanSetting(
  installationId: number
): Promise<boolean> {
  const key = makeKey(installationId)
  const result = await redis.get(key)
  if (result === null || typeof result !== "boolean") {
    return false
  }
  return result
}

/**
 * Set the auto-post plan setting for a GitHub App installation.
 */
export async function setAutoPostPlanSetting(
  installationId: number,
  value: boolean
): Promise<void> {
  const key = makeKey(installationId)
  await redis.set(key, value)
}
