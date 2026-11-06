import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { toDisplayMarkdown } from '../utils/equations';

// Renders summary Markdown, with its {{id}} equation placeholders shown as typeset math
export default function SummaryMarkdown({ text, equations, className = '' }) {
  return (
    <article className={`prose prose-headings:font-heading max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {toDisplayMarkdown(text, equations)}
      </ReactMarkdown>
    </article>
  );
}
