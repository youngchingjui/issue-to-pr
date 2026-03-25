# API Key Management

> This doc describes the **ideal state** of the feature. It may not reflect the current implementation.

## What this feature does

Users bring their own API keys (BYOK) for each model provider they want to use. Keys are stored securely and used to authenticate requests to the provider's API during code generation.

## How it works

- Users add API keys in the Settings page, one per provider.
- Keys are saved securely and never displayed in full after saving — only a masked placeholder is shown.
- When a key is saved, the system validates it with a lightweight test call to the provider. If the key is invalid, the user sees an immediate error.
- Keys can be updated or replaced at any time in Settings.

## Rules

- Users need at least one valid API key before they can generate anything.
- Each provider requires its own key — there is no shared or cross-provider key.
- If a generation is triggered and the selected provider's key is missing or invalid, the generation fails with a clear message. It does not silently fall back to another provider.
- Keys are never shared between users.

## Error messages

| Situation | What the user sees |
|---|---|
| Key is invalid at save time | Immediate error: "This API key is invalid. Please check and try again." |
| Key is invalid at generation time | "Your [Provider] API key is invalid. Check your Settings." |
| Key has exceeded quota | "Your [Provider] usage limit has been reached." |
| Account has insufficient funds | "Your [Provider] account has insufficient funds. Add credits and try again." |
| Any other error | "Something went wrong with [Provider]. Please try again." |
