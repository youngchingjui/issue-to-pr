// TODO: To start off, this Session object should provide some of the same information
// Being returned from our ./auth.ts file.
// You can re-organize it in a way that's cleaner, more readable and intuitive.
// And we'll update the rest of our application to follow along.
//

export type JWT = {
  name?: string | null
  email?: string | null
  picture?: string | null
  sub?: string
  iat?: number
  exp?: number
  jti?: string
}

export type Session = {
  token?: JWT
  profile?: { login: string }
}
