export function markdownToHtml(text: string): string {
  // Store pre-rendered HTML blocks to protect from escaping
  const htmlBlocks: string[] = [];
  function stash(html: string): string {
    const idx = htmlBlocks.length;
    htmlBlocks.push(html);
    return `%%HTML_${idx}%%`;
  }

  let processed = text;

  // 1. Extract mermaid blocks
  processed = processed.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) =>
    stash(`<div class="mermaid my-6 flex justify-center">${code.trim()}</div>`)
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
            `<th class="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b border-gray-200">${c.trim()}</th>`
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
                `<td class="px-4 py-3 text-sm text-gray-700 border-b border-gray-100">${c.trim()}</td>`
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
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200" />')
    // Paragraph breaks
    .replace(
      /\n\n/g,
      '</p><p class="text-gray-700 leading-relaxed mb-3">'
    )
    // Single newlines
    .replace(/\n/g, "<br />");

  // 5. Restore all stashed HTML blocks
  for (let i = 0; i < htmlBlocks.length; i++) {
    html = html.replace(
      `%%HTML_${i}%%`,
      `</p>${htmlBlocks[i]}<p class="text-gray-700 leading-relaxed mb-3">`
    );
  }

  return `<p class="text-gray-700 leading-relaxed mb-3">${html}</p>`;
}
