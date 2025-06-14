// lib/utils/markdown.ts

/**
 * Extracts image URLs from markdown image syntax: ![alt](url "title")
 * Only standard markdown image syntax is supported (does not match <img> HTML).
 * @param markdown The markdown string
 * @returns string[] of image URLs
 */
export function extractImageUrlsFromMarkdown(markdown: string): string[] {
  // Regex: ![alt](url) or ![alt](url "title")
  const imageRegex = /!\[.*?\]\((.*?)(?:\s+(['\"]).*?\2)?\)/g;
  const matches: string[] = [];
  let match;
  while ((match = imageRegex.exec(markdown)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}
