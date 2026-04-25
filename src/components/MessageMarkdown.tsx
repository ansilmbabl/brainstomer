import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const md: Components = {
  p: ({ children }) => (
    <p className="mb-3 [overflow-wrap:anywhere] last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc pl-4 [overflow-wrap:anywhere] last:mb-0 marker:text-zinc-400">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal pl-4 [overflow-wrap:anywhere] last:mb-0 marker:text-zinc-400">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="mt-0.5 [&>ul]:mt-1 [&>ol]:mt-1">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 border-b border-zinc-200/80 pb-1 text-base font-bold first:mt-0 dark:border-zinc-600/60">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1.5 mt-2.5 text-[15px] font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1 mt-1.5 text-sm font-medium first:mt-0">{children}</h4>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-teal-500/50 pl-3 text-sm italic text-zinc-600 dark:text-zinc-400">
      {children}
    </blockquote>
  ),
  a: ({ href, children, ...rest }) => {
    const isExternal = href?.startsWith("http://") || href?.startsWith("https://");
    return (
      <a
        href={href}
        className="font-medium text-teal-600 underline decoration-teal-500/35 underline-offset-2 transition hover:decoration-teal-500 dark:text-teal-400"
        {...(isExternal ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        {...rest}
      >
        {children}
      </a>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-zinc-200/80 bg-zinc-100/90 p-3 text-[13px] leading-relaxed dark:border-zinc-700/60 dark:bg-zinc-950/80">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isFence = /language-/.test(String(className || ""));
    if (isFence) {
      return (
        <code
          className={`block w-fit min-w-0 max-w-full font-mono text-[13px] text-zinc-800 dark:text-zinc-200 ${className ?? ""}`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-zinc-200/80 px-1.5 py-0.5 font-mono text-[0.88em] text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-100"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-2 max-w-full overflow-x-auto">
      <table className="w-full min-w-[12rem] border-collapse border border-zinc-200/80 text-left text-sm dark:border-zinc-700/60">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-100/80 dark:bg-zinc-800/50">{children}</thead>,
  th: ({ children, ...rest }) => (
    <th
      className="border border-zinc-200/80 px-2 py-1.5 text-xs font-semibold dark:border-zinc-700/60"
      {...rest}
    >
      {children}
    </th>
  ),
  td: ({ children, ...rest }) => (
    <td
      className="border border-zinc-200/80 px-2 py-1.5 text-sm dark:border-zinc-700/60"
      {...rest}
    >
      {children}
    </td>
  ),
  tr: ({ children, ...rest }) => <tr {...rest}>{children}</tr>,
  hr: () => <hr className="my-3 border-zinc-200/80 dark:border-zinc-700/60" />,
  strong: ({ children }) => <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="text-zinc-500 line-through dark:text-zinc-500">{children}</del>
  ),
  input: (props) => {
    if (props.type === "checkbox") {
      return (
        <input
          type="checkbox"
          className="mr-1.5 h-3.5 w-3.5 shrink-0 align-middle accent-teal-600"
          disabled
          readOnly
          checked={Boolean(props.checked)}
        />
      );
    }
    return <input {...props} />;
  },
  img: ({ src, alt, ...rest }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      className="my-2 max-h-48 max-w-full rounded-lg object-contain"
      loading="lazy"
      {...rest}
    />
  ),
};

type Props = { children: string; className?: string };

/**
 * Renders assistant/model messages as GFM markdown (headings, lists, code, tables, links, …).
 */
export function MessageMarkdown({ children, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
