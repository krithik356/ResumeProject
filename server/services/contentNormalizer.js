// Fix double-escaped newlines/quotes from AI JSON string output
export function normalizeContent(content) {
    if (!content) return "";

    // Remove BOM if present
    if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
    }

    // Normalize \r\n to \n
    content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const realNewlines = (content.match(/\n/g) || []).length;
    const literalBackslashN = (content.match(/\\n/g) || []).length;

    if (literalBackslashN > realNewlines) {
        // Triple-escaped first: \\\\n → \\n (leave as literal), then \\n → \n
        content = content
            .replace(/\\\\n/g, "%%PRESERVED_ESCAPED_N%%")
            .replace(/\\n/g, "\n")
            .replace(/%%PRESERVED_ESCAPED_N%%/g, "\\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "")
            .replace(/\\\\/g, "\\");
    }

    // Fix backslash-escaped double quotes produced by AI JSON serialization.
    // In JSX/JS source code, \" is never valid inside attribute strings —
    // replace every \" with a plain " throughout the file.
    content = content.replace(/\\"/g, '"');

    return content;
}
