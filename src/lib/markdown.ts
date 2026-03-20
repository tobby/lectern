export function markdownToHtml(text: string): string {
  // Store pre-rendered HTML blocks to protect from escaping
  const htmlBlocks: string[] = [];
  function stash(html: string): string {
    const idx = htmlBlocks.length;
    htmlBlocks.push(html);
    return `%%HTML_${idx}%%`;
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Escape HTML but render inline markdown (bold, italic, code) inside table cells
  function renderCellHtml(str: string): string {
    return escapeHtml(str)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 rounded px-1 text-xs font-mono">$1</code>');
  }

  let processed = text;

  // 1. Extract mermaid blocks
  processed = processed.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) =>
    stash(`<div class="mermaid my-6 flex justify-center">${escapeHtml(code.trim())}</div>`)
  );

  // 2. Extract code blocks
  processed = processed.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) =>
    stash(
      `<pre class="bg-gray-900 text-gray-100 rounded-xl p-4 my-4 overflow-x-auto text-sm font-mono"><code>${code
        .trim()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</code></pre>`
    )
  );

  // 3. Extract markdown tables
  processed = processed.replace(
    /(?:^|\n)(\|.+\|)\n(\|[-:| ]+\|)\n((?:\|.+\|\n?)+)/gm,
    (_, headerRow, _sep, bodyRows) => {
      const headers = headerRow
        .split("|")
        .filter((c: string) => c.trim())
        .map(
          (c: string) =>
            `<th class="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b border-gray-200">${renderCellHtml(c.trim())}</th>`
        )
        .join("");

      const rows = bodyRows
        .trim()
        .split("\n")
        .map((row: string) => {
          const cells = row
            .split("|")
            .filter((c: string) => c.trim())
            .map(
              (c: string) =>
                `<td class="px-4 py-3 text-sm text-gray-700 border-b border-gray-100">${renderCellHtml(c.trim())}</td>`
            )
            .join("");
          return `<tr class="hover:bg-gray-50">${cells}</tr>`;
        })
        .join("");

      return stash(
        `<div class="my-4 overflow-x-auto rounded-lg border border-gray-200"><table class="min-w-full divide-y divide-gray-200"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`
      );
    }
  );

  // 3b. Math fallback rendering
  // Block math $$...$$ → styled monospace div
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) =>
    stash(`<div class="my-3 px-4 py-2 bg-gray-50 rounded-lg font-mono text-sm text-gray-800 overflow-x-auto">${escapeHtml(math.trim())}</div>`)
  );
  // Inline math $...$ → styled code
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) =>
    stash(`<code class="bg-primary-50 text-primary-700 rounded px-1.5 py-0.5 text-sm font-mono">${escapeHtml(math.trim())}</code>`)
  );

  // 4. Now safe to escape remaining text
  let html = processed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Headings
    .replace(
      /^### (.+)$/gm,
      '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-2">$1</h3>'
    )
    .replace(
      /^## (.+)$/gm,
      '<h2 class="text-xl font-semibold text-gray-900 mt-8 mb-3">$1</h2>'
    )
    .replace(
      /^# (.+)$/gm,
      '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>'
    )
    // Inline code
    .replace(
      /`(.+?)`/g,
      '<code class="bg-gray-100 rounded px-1.5 py-0.5 text-sm font-mono">$1</code>'
    )
    // Unordered lists
    .replace(
      /^[-*] (.+)$/gm,
      '<li class="ml-4 list-disc text-gray-700">$1</li>'
    )
    // Ordered lists
    .replace(
      /^\d+\. (.+)$/gm,
      '<li class="ml-4 list-decimal text-gray-700">$1</li>'
    )
    // Blockquotes (must match &gt; since > was already escaped)
    .replace(
      /^&gt; (.+)$/gm,
      '<blockquote class="border-l-4 border-primary-200 bg-primary-50 pl-4 py-2 my-3 text-sm text-primary-900 rounded-r-lg">$1</blockquote>'
    )
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200" />');

  // 4b. Group consecutive list items into <ul>/<ol> (before converting newlines)
  html = html.replace(
    /(<li class="ml-4 list-disc[^"]*">.*?<\/li>\n?)+/g,
    (match) => `<ul class="my-2 space-y-1">${match.replace(/\n/g, "")}</ul>`
  );
  html = html.replace(
    /(<li class="ml-4 list-decimal[^"]*">.*?<\/li>\n?)+/g,
    (match) => `<ol class="my-2 space-y-1">${match.replace(/\n/g, "")}</ol>`
  );

  // 5. Split into blocks on double newlines, wrap non-block content in <div>
  const blockTagPattern = /^<(?:h[1-3]|ul|ol|blockquote|hr)/;
  const stashPattern = /^%%HTML_\d+%%$/;

  const blocks = html.split(/\n\n+/);
  const output = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";

    // Stash placeholder — restore directly
    if (stashPattern.test(trimmed)) {
      const match = trimmed.match(/%%HTML_(\d+)%%/);
      if (match) {
        return htmlBlocks[parseInt(match[1], 10)];
      }
    }

    // Block-level HTML — pass through
    if (blockTagPattern.test(trimmed)) {
      return trimmed;
    }

    // Regular text — wrap in div, convert inner newlines to <br />
    const inner = trimmed.replace(/\n/g, "<br />");
    return `<div class="text-gray-700 leading-relaxed mb-3">${inner}</div>`;
  });

  let result = output.filter(Boolean).join("\n");

  // Restore any remaining stash placeholders (e.g. inline stashes within blocks)
  for (let i = 0; i < htmlBlocks.length; i++) {
    result = result.replace(`%%HTML_${i}%%`, htmlBlocks[i]);
  }

  return result;
}
