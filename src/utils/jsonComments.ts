/**
 * Strip JavaScript-style comments from JSON content.
 * Minecraft Bedrock manifests often contain comments which are not valid JSON.
 */
export function stripJsonComments(content: string): string {
	let result = "";
	let inString = false;
	let inSingleLineComment = false;
	let inMultiLineComment = false;
	let i = 0;

	while (i < content.length) {
		const char = content[i];
		const nextChar = content[i + 1];

		if (inSingleLineComment) {
			if (char === "\n") {
				inSingleLineComment = false;
				result += char;
			}
			i++;
			continue;
		}

		if (inMultiLineComment) {
			if (char === "*" && nextChar === "/") {
				inMultiLineComment = false;
				i += 2;
				continue;
			}
			i++;
			continue;
		}

		if (inString) {
			result += char;
			// Check for escape sequences
			if (char === "\\" && i + 1 < content.length) {
				result += nextChar;
				i += 2;
				continue;
			}
			if (char === '"') {
				inString = false;
			}
			i++;
			continue;
		}

		// Not in string or comment
		if (char === '"') {
			inString = true;
			result += char;
			i++;
			continue;
		}

		if (char === "/" && nextChar === "/") {
			inSingleLineComment = true;
			i += 2;
			continue;
		}

		if (char === "/" && nextChar === "*") {
			inMultiLineComment = true;
			i += 2;
			continue;
		}

		result += char;
		i++;
	}

	return result;
}

const CONTROL_ESCAPES: Record<string, string> = {
	"\n": "\\n",
	"\r": "\\r",
	"\t": "\\t",
	"\b": "\\b",
	"\f": "\\f",
};

/**
 * Escape raw control characters that appear inside string literals.
 * Pack authors paste multi-line descriptions straight into manifest.json, which
 * Minecraft tolerates but JSON.parse rejects.
 */
export function escapeControlCharsInStrings(content: string): string {
	let result = "";
	let inString = false;
	let i = 0;

	while (i < content.length) {
		const char = content[i];

		if (inString) {
			if (char === "\\" && i + 1 < content.length) {
				result += char + content[i + 1];
				i += 2;
				continue;
			}
			if (char === '"') {
				inString = false;
				result += char;
				i++;
				continue;
			}
			const escaped = CONTROL_ESCAPES[char];
			if (escaped !== undefined) {
				result += escaped;
			} else if (char < " ") {
				// Any other C0 control character
				result += `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
			} else {
				result += char;
			}
			i++;
			continue;
		}

		if (char === '"') {
			inString = true;
		}
		result += char;
		i++;
	}

	return result;
}

/**
 * Remove trailing commas before a closing brace/bracket.
 */
export function stripTrailingCommas(content: string): string {
	let result = "";
	let inString = false;
	let i = 0;

	while (i < content.length) {
		const char = content[i];

		if (inString) {
			if (char === "\\" && i + 1 < content.length) {
				result += char + content[i + 1];
				i += 2;
				continue;
			}
			if (char === '"') inString = false;
			result += char;
			i++;
			continue;
		}

		if (char === '"') {
			inString = true;
			result += char;
			i++;
			continue;
		}

		if (char === ",") {
			// Look ahead past whitespace for a closing bracket
			let j = i + 1;
			while (j < content.length && /\s/.test(content[j])) j++;
			if (content[j] === "}" || content[j] === "]") {
				i++; // drop the comma
				continue;
			}
		}

		result += char;
		i++;
	}

	return result;
}

/**
 * Drop bare string members from objects, e.g. a promo line pasted into a
 * manifest header: `{ "name": "x", "thanks for using my pack!", "uuid": ... }`.
 * Only applied as a repair pass, since it discards content.
 */
export function stripBareStringMembers(content: string): string {
	// A string literal that is followed by a comma or closing brace rather than
	// a colon, and is itself preceded by `{` or `,` (i.e. sits in a key position)
	return content.replace(
		/([{,])\s*"(?:[^"\\]|\\.)*"\s*(?=[,}])/g,
		// Keep the structural character; drop the dangling string (and its comma)
		(_match, prefix: string) => (prefix === "{" ? "{" : ""),
	);
}

/**
 * Parse manifest-style JSON, tolerating the malformations that show up in
 * real-world Bedrock packs: comments, a UTF-8 BOM, unescaped newlines inside
 * descriptions, trailing commas, and stray non-key strings in an object.
 *
 * Repairs are applied progressively so a well-formed manifest takes the fast
 * path and is never rewritten.
 */
export function parseLenientJson<T>(content: string): T {
	const base = stripJsonComments(content.replace(/^\uFEFF/, ""));

	const repairs: ((input: string) => string)[] = [
		(input) => input,
		escapeControlCharsInStrings,
		(input) => stripTrailingCommas(escapeControlCharsInStrings(input)),
		(input) =>
			stripBareStringMembers(
				stripTrailingCommas(escapeControlCharsInStrings(input)),
			),
	];

	let lastError: unknown;
	for (const repair of repairs) {
		try {
			return JSON.parse(repair(base)) as T;
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError;
}
