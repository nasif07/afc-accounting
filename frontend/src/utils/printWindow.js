// Opens a popup window containing a clone of `node`, styled with the app's
// own already-built stylesheets (cloned <link>/<style> elements from the
// current document) rather than an external CDN — this guarantees the
// printed output matches on-screen rendering exactly (same Tailwind classes,
// same design tokens, same @media print rules in index.css) with zero
// network dependency beyond what the app already loaded. It also sidesteps
// the oklch-color canvas-rasterization problem entirely: the browser's
// native print pipeline understands modern CSS color functions natively,
// unlike html2canvas.
export function openPrintWindow(
  node,
  { title = "Print", windowFeatures = "height=800,width=1100", pageOrientation = "portrait" } = {},
) {
  if (!node) return null;

  const printWindow = window.open("", "", windowFeatures);
  if (!printWindow) return null;

  printWindow.document.open();
  printWindow.document.write(
    `<!DOCTYPE html><html><head><title>${title}</title></head><body></body></html>`,
  );
  printWindow.document.close();

  // Reuse the app's real stylesheets (production: <link> tags; dev server:
  // HMR-injected <style> tags) instead of hand-recreating Tailwind classes
  // or fetching a CDN copy.
  const styleNodes = document.querySelectorAll('link[rel="stylesheet"], style');
  styleNodes.forEach((styleNode) => {
    printWindow.document.head.appendChild(styleNode.cloneNode(true));
  });

  // Page orientation is a print-job property, not a per-element CSS one —
  // scoping it to just this popup document (rather than index.css's global
  // @media print rules) lets wide tabular reports opt into landscape
  // without affecting portrait-style reports elsewhere.
  const overrideStyle = printWindow.document.createElement("style");
  overrideStyle.textContent = `
    body { margin: 0; padding: 16px; background: #fff; }
    @page { size: ${pageOrientation}; }
  `;
  printWindow.document.head.appendChild(overrideStyle);

  const clone = node.cloneNode(true);
  // Interactive controls (pagination buttons, action buttons) and icons have
  // no place in printed output.
  clone.querySelectorAll("button, svg").forEach((el) => el.remove());
  printWindow.document.body.appendChild(clone);

  // <link> stylesheets load asynchronously — printing before they resolve
  // would produce unstyled output. Wait for each to load (or fail) first.
  const linkEls = Array.from(
    printWindow.document.querySelectorAll('link[rel="stylesheet"]'),
  );
  const whenStylesReady = linkEls.length
    ? Promise.all(
        linkEls.map(
          (link) =>
            new Promise((resolve) => {
              if (link.sheet) {
                resolve();
                return;
              }
              link.addEventListener("load", resolve, { once: true });
              link.addEventListener("error", resolve, { once: true });
            }),
        ),
      )
    : Promise.resolve();

  whenStylesReady.then(() => {
    requestAnimationFrame(() => {
      printWindow.focus();
      printWindow.print();
    });
  });

  return printWindow;
}
