// packages/infra/providers/clientProviders.ts
import { Octokit } from "@octokit/rest"
import { lazy } from "@shared/utils/lazy"
import OpenAI from "openai"

export type OctokitProvider = () => Promise<Octokit>
export type OpenAIProvider = () => Promise<OpenAI>

export const makeOctokitProvider = (
  tokenProvider: () => Promise<string>
): OctokitProvider =>
  lazy(async () => new Octokit({ auth: await tokenProvider() }))

export const makeOpenAIProvider = (
  apiKeyProvider: () => Promise<string>
): OpenAIProvider =>
  lazy(async () => new OpenAI({ apiKey: await apiKeyProvider() }))
