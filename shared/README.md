# New code organization

This folder will contain shared code across all of our `/apps` (ie `nextjs` and `worker`)

The architecture follows clean architecture principles:

`core` is at bottom
`lib` can import `core`. but not laterally from `adapters` or `/apps`
Same with `adapters` - can only import from `core`. Not from `lib` or `/apps`

`/core` contains `/entities` and `/ports`

/entities should mostly just be core entities, written with classes, like `AuthSession`. Any methods should only refer to its internal data.
/ports should mostly be ports that access external data (databases, APIs, etc). Should be mostly `interface`

/lib is catch all for any function, workflow, etc. that defines the "business logic" using interfaces defined in `/core`. It cannot import any actual implementations of those ports in `adapters`

`/adapters` actually implement the ports defined in `/core/ports` with actual connections to outside connections.
Finally, `/nextjs` and `/worker` are sort of our "runtime" applications, the root

// TODO: Use LLM to organize this README better. also draw a diagram of the ideal code architecture, probably using some form of hexagonal architecture or clean architecture.
