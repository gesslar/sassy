import uglify from "@gesslar/uglier"

export default [
  ...uglify({
    with: [
      "lints-js",
      "lints-jsdoc",
      "node",
      "react",
      "vscode-extension",
    ],
    options: {
      "react": {files: ["docs/**/*.js{x}?"]},
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
