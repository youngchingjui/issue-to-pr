import { setupServer } from "msw/node"

import { handlers } from "./handlers"

// This configures a request mocking server with the given request handlers.
export const serverApi = setupServer(...handlers)

// Make the `server` available globally
declare global {
  // eslint-disable-next-line no-var
  var server: typeof serverApi
}

global.server = server
