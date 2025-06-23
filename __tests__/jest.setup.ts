import "openai/shims/node"
import "@testing-library/jest-dom"

import dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

// Add any global test setup here
