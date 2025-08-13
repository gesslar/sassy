import js from "@eslint/js"
import jsdoc from "eslint-plugin-jsdoc";
import stylistic from "@stylistic/eslint-plugin"

export default [
  js.configs.recommended,
  jsdoc.configs['flat/recommended'], {
    name: "gesslar/aunty/ignores",
    ignores: [],
  }, {
    name: "gesslar/aunty/languageOptions",
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        fetch: "readonly",
        Headers: "readonly",
      },
    },
  },
  {
    name: "gesslar/aunty/lints-js",
    files: ["src/**/*.{mjs,cjs,js}"],
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/arrow-parens": ["error", "as-needed"],
      "@stylistic/arrow-spacing": ["error", { before: true, after: true }],
      // Ensure control statements and their bodies are not on the same line
      "@stylistic/brace-style": ["error", "1tbs", {allowSingleLine: false}],
      // Same, but for non bracy ones.
      "@stylistic/nonblock-statement-body-position": ["error", "below"],
      "@stylistic/padding-line-between-statements": [
        "error",
        {blankLine: "always", prev: "if", next: "*"},
        {blankLine: "always", prev: "for", next: "*"},
        {blankLine: "always", prev: "while", next: "*"},
        {blankLine: "always", prev: "do", next: "*"},
        {blankLine: "always", prev: "switch", next: "*"}
      ],
      "@stylistic/eol-last": ["error", "always"],
      "@stylistic/indent": ["error", 2, {
        SwitchCase: 1 // Indents `case` statements one level deeper than `switch`
      }],
      "@stylistic/key-spacing": ["error", { beforeColon: false, afterColon: true }],
      "@stylistic/keyword-spacing": ["error", {
        before: false,
        after: true,
        overrides: {
          // Control statements
          return:  { before: true, after: true },
          if:      { after: false },
          else:    { before: true, after: true },
          for:     { after: false },
          while:   { before: true, after: false },
          do:      { after: true },
          switch:  { after: false },
          case:    { before: true, after: true },
          throw:   { before: true, after: false } ,

          // Keywords
          as:      { before: true, after: true },
          of:      { before: true, after: true },
          from:    { before: true, after: true },
          async:   { before: true, after: true },
          await:   { before: true, after: false },
          class:   { before: true, after: true },
          const:   { before: true, after: true },
          let:     { before: true, after: true },
          var:     { before: true, after: true },

          // Exception handling
          catch:   { before: true, after: false },
          finally: { before: true, after: true },
        }
      }],
      "@stylistic/max-len": ["warn", {
        code: 80,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        tabWidth: 2
      }],
      "@stylistic/no-tabs": "error",
      "@stylistic/no-trailing-spaces": ["error"],
      "@stylistic/object-curly-spacing": ["error", "never", {
        objectsInObjects: false,
        arraysInObjects: false
      }],
      "@stylistic/quotes": ["error", "double", {
        avoidEscape: true,
        allowTemplateLiterals: "always"
      }],
      "@stylistic/semi": ["error", "never"],
      "@stylistic/space-before-function-paren": ["error", "never"],
      "@stylistic/yield-star-spacing": ["error", { before: true, after: false }],
      "constructor-super": "error",
      "no-unexpected-multiline": "error",
      "no-unused-vars": ["error", {
        caughtErrors: "all",
        caughtErrorsIgnorePattern: "^_+",
        argsIgnorePattern: "^_+",
        destructuredArrayIgnorePattern: "^_+",
        varsIgnorePattern: "^_+"
      }],
      "no-useless-assignment": "error",
    }
  },
  {
    name: "gesslar/aunty/lints-jsdoc",
    files: ["src/**/*.{mjs,cjs,js}"],
    plugins: {
      jsdoc,
    },
    rules: {
      "jsdoc/require-description": "error",
      "jsdoc/tag-lines": ["error", "any", {"startLines":1}]
    }
  }
]
