// Prompt and output schema for summarizing a session from its screenshots' OCR text.
//
// Summaries are Markdown, rendered on the website and read aloud by text-to-speech for visually impaired
// users. Equations are written once each, in a session-wide `equations` list with both LaTeX (shown) and
// a spoken form (read aloud); summary text only references them as {{eq1}}, {{eq2}}, ... placeholders.
// That keeps LaTeX out of the text-to-speech path without generating the summaries twice.

// JSON Schema for Gemini's structured output. Gemini refers to screenshots only by index; the server
// maps indices to the stored screenshots, so the model can never invent an image link.
const SESSION_SUMMARY_SCHEMA = {
    type: 'object',
    properties: {
        equations: {
            type: 'array',
            description: 'Every equation or piece of math notation used in the summaries, each defined once and referenced as {{id}}.',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'eq1, eq2, eq3, ... in order of first use.' },
                    latex: { type: 'string', description: 'KaTeX-compatible LaTeX, without $ delimiters.' },
                    spoken: { type: 'string', description: 'The equation read aloud in plain English words; no symbols or LaTeX.' }
                },
                required: ['id', 'latex', 'spoken'],
                propertyOrdering: ['id', 'latex', 'spoken']
            }
        },
        intervals: {
            type: 'array',
            description: 'Topic-based sections of the session, in time order, together covering every screenshot index.',
            minItems: 1,
            items: {
                type: 'object',
                properties: {
                    startIndex: { type: 'integer', minimum: 0, description: 'Index of the first screenshot in this section.' },
                    endIndex: { type: 'integer', minimum: 0, description: 'Index of the last screenshot in this section.' },
                    heading: { type: 'string', description: 'Short plain-text heading naming the topic of this section.' },
                    summary: { type: 'string', description: 'Markdown summary of this section; equations only as {{id}} placeholders.' },
                    keyImages: {
                        type: 'array',
                        description: 'The 1-3 most informative screenshots of this section.',
                        minItems: 1,
                        maxItems: 3,
                        items: {
                            type: 'object',
                            properties: {
                                index: { type: 'integer', minimum: 0, description: 'Screenshot index, within this section.' },
                                caption: { type: 'string', description: 'One line on what this screenshot shows.' }
                            },
                            required: ['index', 'caption'],
                            propertyOrdering: ['index', 'caption']
                        }
                    }
                },
                required: ['startIndex', 'endIndex', 'heading', 'summary', 'keyImages'],
                propertyOrdering: ['startIndex', 'endIndex', 'heading', 'summary', 'keyImages']
            }
        },
        completeSummary: { type: 'string', description: 'Markdown summary of the whole session; equations only as {{id}} placeholders.' }
    },
    required: ['equations', 'intervals', 'completeSummary'],
    propertyOrdering: ['equations', 'intervals', 'completeSummary']
};

function buildSessionSummaryPrompt({ title, screenshotCount, lastIndex, text }) {
    return `You are summarizing a recorded online meeting or class titled "${title}".

The input below is the OCR text of ${screenshotCount} screenshots of the shared screen, taken every few seconds, in time order. Each screenshot starts with a line "[index] HH:MM:SS": its index (0 to ${lastIndex}) and the time since the session started.

About the input:
- Consecutive screenshots often show the same screen, so the same text repeats many times. Treat repeated text as one screen and never repeat it in the summary.
- OCR may misread some words or include screen clutter (menus, clocks, notifications, participant names). Ignore the clutter and read past small errors.
- OCR often garbles equations (superscripts flattened, as in "x2" for x squared; fractions put on one line; symbols misread). Reconstruct the intended equation from context.

Your tasks:
1. Split the session into topic-based sections ("intervals"). Decide the boundaries yourself from where the topic on screen changes; there is no fixed length, and a short session may have just one section. Every index from 0 to ${lastIndex} must belong to exactly one section, and the sections must be contiguous and in time order (the next section's startIndex is the previous endIndex + 1).
2. For each section, write a short heading naming its topic and a concise Markdown summary of what was covered.
3. For each section, pick the 1-3 most informative screenshots by index, from within that section, with a one-line caption saying what each shows. When several screenshots show the same screen, choose the one with the most complete text — usually the last of the run, because slides often build up point by point.
4. Write "completeSummary": a concise, well-structured Markdown summary of the whole session (headings, short paragraphs, bullet points, and a brief conclusion), focused on the essential points, each stated once.

Equations. The summaries are shown on screen with equations rendered from LaTeX, and are also read aloud by text-to-speech for visually impaired users, so equations are handled separately from the text:
- Put every equation, formula and piece of mathematical notation (including complexity such as O(log n)) in "equations", once each, with:
  - "id": eq1, eq2, eq3, ... in order of first use;
  - "latex": standard KaTeX-compatible LaTeX, without $ delimiters (e.g. x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a});
  - "spoken": the equation read aloud in plain English words, as a teacher would say it, with no symbols (e.g. "x equals negative b plus or minus the square root of b squared minus four a c, all over two a").
- In the summary text, write {{eq1}} (the id in double curly braces) exactly where the equation belongs: inside a sentence for a short expression ("the search takes {{eq4}} time"), or alone on its own line for an important or long equation. Reuse the same id wherever the same equation appears again, including in completeSummary.
- Never write LaTeX, dollar signs, backslashes or math symbols directly in the summary text, headings or captions; always use a placeholder. If the session has no math, return an empty "equations" list.

Formatting rules for every summary (sections and completeSummary):
- Use only standard Markdown: #/##/### headings, **bold**, and - bullet points.
- Do NOT use Markdown tables; use headings and bullet points instead, since tables don't read well aloud.
- Headings and captions are plain text without placeholders; mention the topic in words instead.

Screenshots:

${text}`;
}

module.exports = { buildSessionSummaryPrompt, SESSION_SUMMARY_SCHEMA };
