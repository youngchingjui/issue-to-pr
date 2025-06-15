"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

const PREFERRED_REPO_KEY = "preferredRepo"

export default function RepoLocalStorageBootstrap() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only redirect on client: if no repo param in URL and preferredRepo is in localStorage
    const repoParam = searchParams.get("repo")
    if (!repoParam && typeof window !== "undefined") {
      const preferredRepo = window.localStorage.getItem(PREFERRED_REPO_KEY)
      if (preferredRepo) {
        router.replace(`/issues?repo=${encodeURIComponent(preferredRepo)}`)
      }
    }
    // No dependencies - run only once on mount
    // But track searchParams to make sure we're always up to date on client
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return null
}
