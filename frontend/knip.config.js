/** @type {import('knip').KnipConfig} */
export default {
  // ── Entry points ─────────────────────────────────────────────────────────────
  // knip starts its graph walk from these files.
  entry: [
    "src/main.jsx",        // React app root
    "src/Routes/Routes.jsx", // router — contains all React.lazy() page imports
    "index.html",           // Vite HTML entry (picks up <script type="module">)
  ],

  // ── Project files (the universe knip may report on) ───────────────────────
  project: ["src/**/*.{js,jsx}"],

  // ── Test files — excluded from "unused file" reporting ────────────────────
  // but scanned for their own import graph
  ignore: [
    "tailwind.config.js",
  ],

  // ── Plugins ──────────────────────────────────────────────────────────────────
  // knip ships a built-in "react" plugin that understands:
  //   • React.lazy(() => import('./Page'))    — dynamic imports as used entries
  //   • React.forwardRef / React.memo        — wrapped components still count
  // It also has a built-in "vite" plugin that reads vite.config.js.
  // Both are auto-detected; no explicit enablement needed.

  // ── Vitest ────────────────────────────────────────────────────────────────────
  // Include setup.js so knip knows @testing-library/jest-dom is legitimately used
  vitest: {
    config: ["vite.config.js"],
    entry: ["src/test/**/*.{test,spec}.{js,jsx}", "src/test/setup.js"],
  },

  // ── Ignore patterns ───────────────────────────────────────────────────────
  // CSS modules, assets, etc. that knip shouldn't chase
  ignoreExportsUsedInFile: true,   // barrel re-exports are "used" inside the barrel
};
