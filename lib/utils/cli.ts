// CLI and shell utilities - command-line interface helpers

/**
 * Safe quoting helper for POSIX shells.
 *
 * Why this exists
 * ----------------
 * Any time we interpolate arbitrary text into a shell command we risk the text
 * being interpreted as shell syntax – `$HOME`, `$(...)`, `;`, `&&`, etc.  The
 * standard, portable defence is to wrap the text in single-quotes *and* to
 * escape any embedded single-quotes with the classic `'\''` dance.  This
 * converts the input into a literal byte sequence as far as the shell is
 * concerned.
 *
 * Algorithm
 * ---------
 * 1. Surround the whole string with single-quotes: `' ... '`.  Inside single
 *    quotes the shell performs **no** interpolation or expansion.
 * 2. Replace every single quote inside the original string with the three-step
 *    sequence `'\'\''`:
 *       – close the current quote (')
 *       – emit an escaped single-quote (\')
 *       – reopen the quote (')
 *
 *    In code: `str.replace(/'/g, "'\\''")`.
 * 3. Concatenate the opening quote, transformed text, and closing quote.
 *
 * Practical examples
 * ------------------
 * shellEscape("Hello World")          -> `'Hello World'`
 * shellEscape("O'Reilly")             -> `'O'\''Reilly'`
 * shellEscape("rm -rf /; echo $HOME") -> `'rm -rf /; echo $HOME'`
 * shellEscape("$(touch HACKED).txt")  -> `'$(touch HACKED).txt'`
 *
 * Edge cases
 * ----------
 * • Empty string → `''` (still safe)
 * • Multi-line strings are preserved; newlines are not special inside quotes.
 * • Very large inputs still work but may exceed OS command-line length limits –
 *   in that case prefer piping via stdin.
 *
 * Use this helper whenever you build a shell command from external or variable
 * data (e.g. inside Docker exec calls, printf > file redirections, etc.).
 */
export function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'"
}
