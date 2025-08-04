# Legacy Code

This directory is a temporary home for existing code during the migration to clean architecture.

## Purpose

During the migration process, we'll gradually move existing code to proper architectural layers. This folder serves as a staging area to:

1. **Maintain functionality** - Keep existing features working during migration
2. **Track progress** - Clearly see what still needs to be migrated
3. **Reduce risk** - Make incremental changes rather than big-bang refactoring

## Migration Process

Code in this folder should be gradually moved to appropriate layers:

```
lib/legacy/agents/     → lib/domain/services/ + lib/application/usecases/
lib/legacy/workflows/  → lib/application/usecases/
lib/legacy/github/     → lib/infrastructure/clients/github/
lib/legacy/neo4j/      → lib/infrastructure/database/neo4j/
```

## Rules

1. **No new code** - Don't add new features to legacy folder
2. **Gradual migration** - Move code piece by piece during regular development
3. **Backward compatibility** - Keep existing imports working during migration
4. **Documentation** - Update this README as code is moved

## Current Status

- [ ] `lib/agents/` - Not yet moved
- [ ] `lib/workflows/` - Not yet moved
- [ ] `lib/github/` - Not yet moved
- [ ] `lib/neo4j/` - Not yet moved

## Target: Empty Folder

The goal is for this folder to eventually be empty, indicating that all code has been properly organized according to clean architecture principles.

See `/docs/guides/migration-guidelines.md` for detailed migration steps.
