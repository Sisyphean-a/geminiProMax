export function extractTextNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip code blocks and pre tags
        const parent = node.parentElement;
        if (parent && (parent.tagName === 'CODE' || parent.tagName === 'PRE')) {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip empty whitespace only nodes
        if (!node.textContent?.trim()) {
           return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const nodes: Text[] = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    nodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }
  return nodes;
}
