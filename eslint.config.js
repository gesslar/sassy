import uglify from "@gesslar/uglier"

export default [
  ...uglify({
    with: [

      "lints-jsdoc", // default files: ["**/*.{js,mjs,cjs}"
      "react", // default files: ["src/**/*.{js,jsx,mjs,cjs}"]
      "vscode-extension", // default files: ["src/**/*.{js,mjs,cjs}"]
      "node" // default files: ["**/*.{js,mjs,cjs}"]
    ],
    overrides: {
      "lints-js": "src/**/*.{cj}?js",
      "lints-jsdoc": "src/**/*.{cj}?js",
      "node": "src/**/*.{cj}?js",
      "react": "docs/**/*.js{x}?",
    }
  }),
  {
    files: ["docs/**/*.js", "docs/**/*.jsx"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {jsx: true},
      },
    },
  }
]
