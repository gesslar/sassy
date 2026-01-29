import React from "react"
import BaseCodeBlock from "@theme/CodeBlock"

const LangLabels = {
  yaml: "YAML",
  json: "JSON",
  json5: "JSON5",
  bash: "TERMINAL",
  terminal: "TERMINAL",
  javascript: "JAVASCRIPT",
  js: "JAVASCRIPT",
}

export default function CodeBlock({lang, label, children}) {
  const displayLabel = label || LangLabels[lang] || lang?.toUpperCase() || ""

  return (
    <>
      {displayLabel && <small>{displayLabel}</small>}
      <BaseCodeBlock language={lang}>
        {typeof children === "string" ? children.trim() : children}
      </BaseCodeBlock>
    </>
  )
}
