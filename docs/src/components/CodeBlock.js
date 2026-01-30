import React from "react"
import BaseCodeBlock from "@theme/CodeBlock"

const LangLabels = {
  bash: "TERMINAL",
  js: "JAVASCRIPT",
}

/**
 * @import {JSX} from "react"
 */

/**
 * CodeBlock component renders a code block with an optional language label.
 *
 * @param {object} props - Component props
 * @param {string} [props.lang] - The language of the code block
 * @param {string} [props.label] - Optional label to display above the code block
 * @param {React.ReactNode} props.children - The code content to display
 * @returns {JSX.Element} The rendered code block component
 */
export default function CodeBlock({lang, label, children}) {
  const displayLabel = label || LangLabels[lang] || lang || ""

  if(typeof children === "string") {
    while(children.charCodeAt(0) === 10) {
      children = children.slice(1)
    }

    while(children.charCodeAt(children.length-1) === 10 &&
          children.charCodeAt(children.length-2) === 10) {
      children = children.slice(0, children.length - 2)
    }
  }

  return (
    <>
      {displayLabel && <small class="fenced-label">{displayLabel}</small>}
      <BaseCodeBlock language={lang}>{children}</BaseCodeBlock>
    </>
  )
}
