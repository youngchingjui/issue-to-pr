# Multi-Model Support

> This doc describes the **ideal state** of the feature. It may not reflect the current implementation.

## What this feature does

Users can choose between OpenAI and Anthropic (Claude) models when generating code and pull requests. Different models have different strengths — Claude models tend to produce higher-quality HTML output, while GPT models may suit other generation tasks.

## User stories

- As a user, I want to add my Anthropic API key in settings so I can use Claude models.
- As a user, I want to set a default model provider so all my generations use my preferred model without choosing it every time.
- As a user, I want to pick a specific model for a particular generation when I want to override my default.
- As a user, I want to see which model was used for each generation so I can compare results.
- As a user, I want clear error messages when my API key is invalid or my quota is exceeded so I know exactly what to fix.

## What users can do

- Add an Anthropic API key in the Settings page alongside their existing OpenAI key
- Set a preferred default provider (OpenAI or Anthropic) in Settings
- Override the model on a per-generation basis without changing their default
- See the model used for any past generation in the generation history

## Defaults and fallbacks

- Users cannot generate anything until they add at least one API key (OpenAI or Anthropic).
- The first API key a user adds automatically becomes their default provider.
- Adding a second API key later does not change the default — users change their default explicitly in Settings.
- Users can change their default provider at any time in Settings.
- The list of available models for each provider should always be kept up to date, especially when new models are released.
- A per-generation selection overrides the default, but only for that generation.
- If a selected provider's API key is missing or invalid, the generation fails with a clear message — it does not silently fall back to another provider.

## Settings

- The Settings page has a section for each provider (OpenAI, Anthropic).
- Each section has an API key field. Keys are saved securely and never displayed in full after saving.
- A separate field (or toggle) lets users pick their default provider.
- Per-generation model selection appears in the generation form, not in Settings.
