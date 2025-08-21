import { Suspense } from "react"

import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import OpenAIApiKeyCardClient from "./OpenAIApiKeyCardClient"

async function OpenAIApiKeyCardInner() {
	const existingKey = await getUserOpenAIApiKey()
	if (existingKey) return null
	return <OpenAIApiKeyCardClient initialKey="" />
}

export default function OpenAIApiKeyCard() {
	return (
		<Suspense>
			{/* No fallback: do not block the page while loading */}
			{/* @ts-expect-error Async Server Component */}
			<OpenAIApiKeyCardInner />
		</Suspense>
	)
}
