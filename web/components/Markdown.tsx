import React from "react";

// Minimal markdown renderer for LLM output: **bold**, bullet lines (* or -),
// and paragraphs. Dep-free; handles the subset our summaries/chat produce.

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={blocks.length} className="list-disc pl-5 space-y-1 my-2">
          {bullets.map((li, i) => (
            <li key={i}>{renderInline(li)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[*-]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    if (line.trim() === "") continue;
    blocks.push(
      <p key={blocks.length} className="my-1">
        {renderInline(line)}
      </p>,
    );
  }
  flush();

  return <div className="space-y-1">{blocks}</div>;
}
