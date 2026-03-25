# Multi-Model Support

> This doc describes the **ideal state** of the feature. It may not reflect the current implementation.

## What this feature does

Users can choose which AI model powers their code generation and pull request workflows. Different models have different strengths — some produce higher-quality code in certain languages, some are faster, some are more cost-effective. The platform supports multiple model providers (e.g., OpenAI, Anthropic) and is designed to accommodate new providers as they become available.

Regardless of which model is selected, the end result is the same: code changes on a branch, optionally with a pull request.

## User stories

- As a user, I want to add API keys for my preferred model providers so I can use their models.
- As a user, I want to set a default model provider so all my generations use my preferred model without choosing it every time.
- As a user, I want to pick a specific model for a particular generation when I want to override my default.
- As a user, I want to see which model was used for each generation so I can compare results.
- As a user, I want clear error messages when my API key is invalid or my quota is exceeded so I know exactly what to fix.

## What users can do

- Add API keys for any supported provider in the Settings page
- Set a preferred default provider in Settings
- Override the model on a per-generation basis without changing their default
- See the model used for any past generation in the generation history

## Defaults and fallbacks

- Users cannot generate anything until they add at least one API key for a supported provider.
- The first API key a user adds automatically becomes their default provider.
- Adding additional API keys later does not change the default — users change their default explicitly in Settings.
- Users can change their default provider at any time in Settings.
- The list of available models and providers should always be kept up to date, especially when new models or providers become available.
- A per-generation selection overrides the default, but only for that generation.
- If a selected provider's API key is missing or invalid, the generation fails with a clear message — it does not silently fall back to another provider.

## Settings

- The Settings page has a section for each supported provider.
- Each section has an API key field. Keys are saved securely and never displayed in full after saving.
- A separate field (or toggle) lets users pick their default provider.
- Per-generation model selection appears in the generation form, not in Settings.

## Behavioral differences between providers

Users should not need to think about implementation details, but they may notice practical differences:

- Different models may produce different commit styles, file structures, or code patterns.
- All providers have access to the same capabilities: reading files, editing code, running shell commands, creating branches, and opening pull requests.
- Generation speed and token costs differ between providers and models.
