/**
 * Renders a model's streaming text as proper typography.
 *
 * The response from an LLM is markdown. Rendering it as
 * whitespace-pre-wrap is the single largest quality hit in the UI —
 * you see '###' and '**' instead of structure. We parse markdown
 * with react-markdown + remark-gfm (tables, strikethrough, task
 * lists, autolinks) and map each element to a component styled to
 * DESIGN.md: Geist body, tight heading scale, tabular tables, mono
 * inline code, champagne accent on links and the cite bar.
 *
 * Partial content is handled by react-markdown's parser — malformed
 * mid-token markdown just falls through as plain text until the next
 * token lands, so streaming does not jitter.
 */
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  text: string;
  streaming?: boolean;
}

export const ModelResponse = memo(function ModelResponse({ text, streaming }: Props) {
  return (
    <div className="model-response text-[var(--text)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-[22px] font-semibold tracking-[-0.01em] leading-[1.2] mt-5 mb-2.5 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[18px] font-semibold tracking-[-0.005em] leading-[1.25] mt-5 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[15px] font-semibold tracking-[0.005em] leading-[1.3] mt-4 mb-1.5 first:mt-0 text-[var(--text)]">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.14em] mt-4 mb-1.5 text-[var(--text-muted)] font-[var(--font-mono)]">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-[14.5px] leading-[1.65] my-2.5 first:mt-0 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--text)]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[var(--text)]">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-2.5 ml-[18px] space-y-1.5 list-disc marker:text-[var(--text-faint)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 ml-[22px] space-y-1.5 list-decimal marker:text-[var(--text-subtle)] marker:font-[var(--font-mono)]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[14.5px] leading-[1.55] pl-1">{children}</li>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent-hairline)] hover:decoration-[var(--accent)]"
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const isBlock = /language-/.test(className || "");
            if (isBlock) {
              return (
                <code className="font-[var(--font-mono)] text-[12.5px] leading-[1.55]">
                  {children}
                </code>
              );
            }
            return (
              <code className="font-[var(--font-mono)] text-[13px] bg-[var(--elev-1)] border border-[var(--border)] rounded-[4px] px-[5px] py-[1px] text-[var(--text)]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-3 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] px-3.5 py-3 overflow-auto text-[12.5px] leading-[1.55] font-[var(--font-mono)] text-[var(--text)]">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 pl-4 border-l-2 border-[var(--accent-hairline)] text-[var(--text-muted)] italic font-[var(--font-serif)] text-[15px] leading-[1.6]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-5 border-0 h-px bg-[var(--border)]" />,
          table: ({ children }) => (
            <div className="my-4 overflow-auto rounded-[var(--radius-sm)] border border-[var(--border)]">
              <table className="w-full border-collapse text-[13px] font-[var(--font-sans)]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[var(--elev-1)]">{children}</thead>
          ),
          th: ({ children, style }) => (
            <th
              className="text-left font-medium text-[10.5px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-muted)] px-3 py-2 border-b border-[var(--border)]"
              style={style}
            >
              {children}
            </th>
          ),
          td: ({ children, style }) => (
            <td
              className="px-3 py-2 border-b border-[var(--border)] last:border-b-0 text-[var(--text)] tabular-nums"
              style={style}
            >
              {children}
            </td>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="last:[&_td]:border-b-0">{children}</tr>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
      {streaming && (
        <span
          className="inline-block ml-0.5 w-[7px] h-[14px] -mb-[1px] align-middle"
          style={{
            background: "var(--text-subtle)",
            animation: "adk-caret 1s steps(2, end) infinite",
            borderRadius: 1,
          }}
          aria-hidden
        />
      )}
      <style>{`
        @keyframes adk-caret {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
});
