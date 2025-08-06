# New code organization

This folder will contain shared code across all of our `/apps` (ie `2a nextjs` and `2b worker)

Folders are named with numbers and letters to denote the heirarchy and structure.

`0 core` is at bottom
`1a lib` can import `0 core`. but not laterally from `1b adapters` or `/apps`
Same with `1b adapters` - can only import from `0 core`. Not from `1a lib` or `/apps`

`/0 core` contains `/entities` and `/ports`

/entities should mostly just be core entities, written with classes, like `AuthSession`. Any methods should only refer to its internal data.
/ports should mostly be ports that access external data (databases, APIs, etc). Should be mostly `interface`

/lib is catch all for any function, workflow, etc. that defines the "business logic" using interfaces defined in `/0 core`. It cannot import any actual implementations of those ports in `1b adapters`

`/1b adapters` actually implement the ports defined in `/0 core/ports` with actual connections to outside connections.
Finally, `/2a nextjs` and `/2b worker` are sort of our "runtime" applications, the root
