import { markdownToSpeechText } from './textForSpeech';

// Summary text marks each equation with a placeholder like {{eq1}}; the summary response carries
// `equations: [{ id, latex, spoken }]`. These helpers turn the same text into what each use needs:
//   - display: Markdown with LaTeX math, for ReactMarkdown + remark-math + rehype-katex
//   - speech:  plain text with every equation in words, for text-to-speech
//   - copy:    Markdown with $latex$, so a paste keeps the equations
// A placeholder alone on its own line is a displayed (block) equation; inside a sentence it's inline.

const PLACEHOLDER = /\{\{\s*([A-Za-z][\w-]*)\s*\}\}/g;
const BLOCK_PLACEHOLDER = /^[ \t]*\{\{\s*([A-Za-z][\w-]*)\s*\}\}[ \t]*$/gm;

function byId(equations) {
    return new Map((equations || []).map((equation) => [equation.id, equation]));
}

// For on-screen rendering. Any "$" already in the text is escaped first so only our equations become math.
export function toDisplayMarkdown(text, equations) {
    const lookup = byId(equations);
    return (text || '')
        .replace(/\$/g, '\\$')
        .replace(BLOCK_PLACEHOLDER, (match, id) => (lookup.has(id) ? `\n$$\n${lookup.get(id).latex}\n$$\n` : ''))
        .replace(PLACEHOLDER, (match, id) => (lookup.has(id) ? `$${lookup.get(id).latex}$` : ''));
}

// For text-to-speech: equations in words, Markdown stripped. LaTeX is never read aloud.
export function toSpeechText(text, equations) {
    const lookup = byId(equations);
    const withWords = (text || '').replace(PLACEHOLDER, (match, id) => (lookup.has(id) ? ` ${lookup.get(id).spoken} ` : ' '));
    return markdownToSpeechText(withWords);
}

// For the clipboard: Markdown with standard $...$ / $$...$$ math
export function toCopyText(text, equations) {
    const lookup = byId(equations);
    return (text || '')
        .replace(BLOCK_PLACEHOLDER, (match, id) => (lookup.has(id) ? `$$${lookup.get(id).latex}$$` : ''))
        .replace(PLACEHOLDER, (match, id) => (lookup.has(id) ? `$${lookup.get(id).latex}$` : ''));
}
