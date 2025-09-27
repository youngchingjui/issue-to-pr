import { Octokit } from "@octokit/rest"
import type OpenAI from "openai"

import { lazy } from "@/utils/lazy"

export type OctokitProvider = () => Promise<Octokit>
export type OpenAIProvider = () => Promise<OpenAI>

export const makeOctokitProvider = (
  tokenProvider: () => Promise<string>
): OctokitProvider =>
  lazy(async () => new Octokit({ auth: await tokenProvider() }))

export const makeOpenAIProvider = (
  apiKeyProvider: () => Promise<string>
): OpenAIProvider =>
  lazy(async () => {
    const { default: OpenAIClient } = await import("openai")
    return new OpenAIClient({ apiKey: await apiKeyProvider() })
  })
