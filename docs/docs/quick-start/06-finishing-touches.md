---
sidebar_position: 6
title: "Finishing Touches"
---

import CodeBlock from "@site/src/components/CodeBlock"

Let's round out the theme with status colours and the remaining UI surfaces.

## Status Colours

Add a `status` group to your variables:

<CodeBlock lang="yaml">{`

  vars:
    status:
      error: $$red
      warning: $$yellow
      success: $$green
      info: $$cyan

`}</CodeBlock>

These are semantic aliases — if you later decide errors should be orange instead of red, you change it in one place.

## More UI Properties

Add these to your `theme.colors`:

<CodeBlock lang="yaml">{`

  theme:
    colors:
      errorForeground: $(status.error)
      list.errorForeground: $(status.error)
      list.warningForeground: $(status.warning)
      statusBar.background: $(std.bg.accent)
      statusBar.foreground: $(std.fg)
      activityBar.background: $(std.bg)
      activityBar.foreground: $(accent)
      sideBar.background: $(std.bg.panel)
      sideBar.foreground: $(std.fg)
      input.background: $(std.bg)
      input.foreground: $(std.fg)
      input.border: $(std.outline)
      button.background: $(std.bg.accent)
      button.foreground: $(std.fg)

`}</CodeBlock>

## The Complete Theme

Here's the full `ocean.yaml` at this point:

<CodeBlock lang="yaml">{`

  config:
    name: "Ocean"
    type: dark

  palette:
    blue: "#2d5a87"
    cyan: "#4a9eff"
    gray: "#3c3c3c"
    white: "#e6e6e6"
    red: "#ff6b6b"
    green: "#51cf66"
    yellow: "#ffd93d"

  vars:
    accent: $$cyan

    std:
      fg: $$white
      fg.inactive: fade($(std.fg), 60)
      bg: "#1a1a2e"
      bg.panel: lighten($(std.bg), 15)
      bg.accent: darken($(accent), 70)
      outline: fade($(accent), 30)
      shadow: fade($(std.bg), 80)

    status:
      error: $$red
      warning: $$yellow
      success: $$green
      info: $$cyan

  theme:
    colors:
      editor.background: $(std.bg)
      editor.foreground: $(std.fg)
      editorGroupHeader.tabsBackground: $(std.bg.panel)
      tab.activeBackground: $(std.bg)
      tab.activeForeground: $(std.fg)
      tab.inactiveBackground: $(std.bg.panel)
      tab.inactiveForeground: $(std.fg.inactive)
      focusBorder: $(std.outline)
      panel.border: $(std.outline)
      editorOverviewRuler.border: $(std.outline)
      widget.shadow: $(std.shadow)
      titleBar.activeBackground: $(std.bg.accent)
      titleBar.activeForeground: $(std.fg)
      titleBar.inactiveBackground: $(std.bg.accent)
      titleBar.inactiveForeground: $(std.fg.inactive)
      errorForeground: $(status.error)
      list.errorForeground: $(status.error)
      list.warningForeground: $(status.warning)
      statusBar.background: $(std.bg.accent)
      statusBar.foreground: $(std.fg)
      activityBar.background: $(std.bg)
      activityBar.foreground: $(accent)
      sideBar.background: $(std.bg.panel)
      sideBar.foreground: $(std.fg)
      input.background: $(std.bg)
      input.foreground: $(std.fg)
      input.border: $(std.outline)
      button.background: $(std.bg.accent)
      button.foreground: $(std.fg)

    tokenColors:
      - name: Comments
        scope: comment
        settings:
          foreground: $(std.fg.inactive)
          fontStyle: italic

      - name: Keywords
        scope: keyword, storage.type
        settings:
          foreground: $(accent)

      - name: Strings
        scope: string
        settings:
          foreground: $$green

      - name: Numbers
        scope: constant.numeric
        settings:
          foreground: $$yellow

      - name: Functions
        scope: entity.name.function
        settings:
          foreground: $$cyan

      - name: Classes
        scope: entity.name.class, entity.name.type
        settings:
          foreground: $$blue
          fontStyle: bold

    semanticTokenColors:
      variable.declaration:
        foreground: $(std.fg)
        fontStyle: italic
      function.declaration:
        foreground: $(accent)
        fontStyle: bold
      "string:escape": $$yellow

`}</CodeBlock>

## Installing in VS Code

To try your theme:

1. Create a folder in your VS Code extensions directory:
   - **Linux/macOS:** `~/.vscode/extensions/ocean-theme/`
   - **Windows:** `%USERPROFILE%\.vscode\extensions\ocean-theme\`
2. Copy `ocean.color-theme.json` into that folder
3. Create a `package.json` alongside it:

<CodeBlock lang="json">{`

   {
     "name": "ocean-theme",
     "displayName": "Ocean",
     "version": "0.0.1",
     "engines": { "vscode": "^1.80.0" },
     "categories": ["Themes"],
     "contributes": {
       "themes": [{
         "label": "Ocean",
         "uiTheme": "vs-dark",
         "path": "./ocean.color-theme.json"
       }]
     }
   }

`}</CodeBlock>

1. Reload VS Code and select **Ocean** from the theme picker

Alternatively, use the [Yeoman VS Code Extension Generator](https://code.visualstudio.com/api/get-started/your-first-extension) (`yo code`) to scaffold a proper extension.

## Build It

<CodeBlock lang="bash">{`

  npx @gesslar/sassy build ocean.yaml

`}</CodeBlock>

You've got a complete, maintainable dark theme built from a single source of
truth. One last thing to learn — watch mode for live development.
