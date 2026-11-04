// Steers Gemini away from LaTeX/tables since the summary is rendered as plain Markdown and read aloud via TTS (client/src/utils/textForSpeech.js)
function buildSessionSummaryPrompt(rawText) {
    return `The input text below contains many rewritten sentences and redundant information. Go through it carefully and generate a concise and clear summary, removing all repetitions and redundancies. Focus only on the essential points and present them once in a well-structured format: headings, side-headings, paragraphs, bullet points, conclusion.

This summary will be (a) rendered as plain Markdown with no math/LaTeX support, and (b) read aloud by text-to-speech for visually impaired users. So:
- Do NOT use LaTeX or math notation of any kind: no dollar signs, no backslash commands (\\cup, \\frac, \\text, etc.), no subscript/superscript syntax.
- If the source material contains equations, formulas, or symbolic notation, describe them in plain spoken English instead (e.g. "the union of A and B" rather than "$A \\cup B$", "n squared" rather than "$n^2$").
- Do NOT use Markdown tables — use headings and bullet points instead, since tables don't read well aloud.
- Use only standard Markdown: #/##/### headings, **bold**, and - bullet points.

Here's the text:  \n\n${rawText}`;
}

module.exports = { buildSessionSummaryPrompt };
