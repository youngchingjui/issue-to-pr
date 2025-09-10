import type {
  OpenAIKeyDeps,
  SharedKeyAccessPolicy,
  UserIdentity,
} from "@shared/core/ports/api-keys"

/**
 * Default policy: allow access to shared key for all authenticated users.
 * Replace with business rules later (e.g., roles, quotas, trial periods).
 */
export const allowAllSharedKeyPolicy: SharedKeyAccessPolicy = {
  async canUseSharedKey(_user: UserIdentity): Promise<boolean> {
    return true
  },
}

/**
 * Convenience constructor for OpenAI key deps using a supplied policy.
 * App-level code should provide concrete adapters for user/shared key readers/writers.
 */
export function withPolicy(policy: SharedKeyAccessPolicy) {
  return (deps: Omit<OpenAIKeyDeps, "policy">): OpenAIKeyDeps => ({
    ...deps,
    policy,
  })
}

