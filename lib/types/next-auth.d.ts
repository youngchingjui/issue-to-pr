// Make sure this file is included by tsconfig (tsconfig.json already includes "lib/**/*")
import "next-auth"
import "next-auth/jwt"

declare module "next-auth/jwt" {
  interface JWT {
    // from OAuth account you spread into the token
    access_token?: string
    refresh_token?: string
    expires_at?: number
    expires_in?: number
    scope?: string
    token_type?: string
    id_token?: string
    provider?: string

    // what you add in callbacks
    profile?: { login: string }
  }
}

declare module "next-auth" {
  interface Session {
    // you set this in the session callback
    token?: import("next-auth/jwt").JWT
    profile?: { login: string }
  }
}
