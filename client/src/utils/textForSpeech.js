// Converts Markdown to plain speakable text so the TTS engine doesn't read out syntax characters
export function markdownToSpeechText(markdown) {
    if (!markdown) return '';

    return markdown
        .replace(/```[\s\S]*?```/g, ' ')          // fenced code blocks
        .replace(/`([^`]+)`/g, '$1')              // inline code
        .replace(/\$\$([\s\S]*?)\$\$/g, '$1')     // block math delimiters
        .replace(/\$([^$]+)\$/g, '$1')            // inline math delimiters
        .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1') // \text{...}, \frac{...}{...}, etc.
        .replace(/\\[a-zA-Z]+/g, ' ')             // remaining LaTeX commands like \cup
        .replace(/^#{1,6}\s+(.*?)[.:!?]?\s*$/gm, '$1.') // headings: drop markers, end with a pause
        .replace(/^-{3,}\s*$/gm, ' ')             // horizontal rules
        .replace(/\*\*([^*]+)\*\*/g, '$1')        // bold
        .replace(/\*([^*]+)\*/g, '$1')            // italic
        .replace(/^[*-]\s+/gm, '')                // bullet list markers
        .replace(/^\d+\.\s+/gm, '')               // numbered list markers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links -> link text
        .replace(/[_~]/g, '')                     // leftover emphasis/strikethrough markers
        .replace(/\s+/g, ' ')
        .trim();
}
