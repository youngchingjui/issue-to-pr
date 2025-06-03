import React from "react";
import ReactMarkdown from "react-markdown";

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={className ? className : "prose prose-sm dark:prose-invert max-w-none"}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
