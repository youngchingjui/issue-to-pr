This folder is a placeholder for our NextJS app.

For legacy reasons, the NextJS lives in the root of this codebase, and it's too much trouble to move it here and properly convert this codebase to a monorepo.

So we'll just point to where the NextJS app mostly lives from here, mainly at `/app`, `/components`, and `/lib`

The root `package.json` file also refers mainly to the NextJS app, though we also configure `workspaces` to also compile and build the other apps, such as the worker app.
