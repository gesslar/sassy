# Copilot Pull Request Review Instructions

## Primary Focus
Review code for **functional correctness and logical issues only**. Do not suggest style changes - this repository has comprehensive ESLint configuration that handles all formatting and style preferences.

## What to Review

### ✅ Focus On
- **Actual bugs and logic errors** that could cause runtime failures
- **Security vulnerabilities** and potential exploits
- **Performance issues** that could impact application behavior
- **Modern JavaScript opportunities** where verbose patterns can be simplified using `??`, `?.`, destructuring, or other concise modern syntax
- **Missing error handling** only when it could cause actual problems

### ❌ Do Not Review
- **Code style and formatting** - ESLint handles this completely
- **JSDoc completeness** - intentionally managed by the developer
- **Theoretical edge cases** - focus on realistic scenarios
- **Enterprise-style suggestions** about comment tone or verbosity

## Review Guidelines

### Context Awareness
Before flagging potential issues:
1. **Trace the call chain** - check if validation/guards exist elsewhere in the pipeline
2. **Consider the broader codebase** - look at how similar patterns are handled
3. **Verify actual risk** - avoid "this could result in..." warnings for well-guarded code

### Suggestion Style
- **Declarative over imperative** - suggest intent, not implementation details
- **Concise over verbose** - prefer modern JavaScript patterns that reduce code
- **Practical over theoretical** - focus on real-world improvements

### Modern JavaScript Patterns
When suggesting improvements, prefer:
- `value?.property` over `value && value.property`
- `value ?? defaultValue` over `value === null || value === undefined ? defaultValue : value`
- Destructuring over repeated property access
- Template literals over string concatenation
- Array methods over manual loops where appropriate

## Repository Context

This is a personal project repository (not enterprise), using:
- **Modern ES modules** with comprehensive ESLint configuration
- **Node.js environment** with latest ECMAScript features
- **Stylistic preferences** strictly enforced by tooling

The ESLint configuration in this repository is extremely comprehensive and handles all style preferences including spacing, quotes, semicolons, indentation, and formatting. Any style-related suggestions will conflict with the established tooling and developer preferences.

## Key Rule
**Trust the existing tooling and focus on code that could actually break or be improved functionally.** If ESLint allows it and tests pass, style is not a concern for review.
