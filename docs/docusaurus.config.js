// @ts-check

import {themes as prismThemes} from "prism-react-renderer"

const {vsDark: PrismLight, vsDark: PrismDark} = prismThemes

/**
 * @import {Config} from "@docusaurus/types"
 * @import {Options, ThemeConfig} from "@docusaurus/preset-classic"
 */

/** @type {Config} */
const config = {
  title: "sassy",
  tagline: "Make gorgeous themes that speak as boldly as you do.",
  favicon: "img/double-s-bg.svg",

  future: {
    v4: true,
  },

  url: "https://sassy.gesslar.io",
  baseUrl: "/",

  organizationName: "gesslar",
  projectName: "sassy",

  onBrokenLinks: "throw",
  onBrokenAnchors: "throw",
  onDuplicateRoutes: "throw",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    hooks: {
      onBrokenMarkdownImages: "throw",
      onBrokenMarkdownLinks: "throw",
    }
  },

  presets: [
    [
      "classic",
      /** @type {Options} */
      ({
        docs: {
          sidebarPath: "./sidebars.js",
          editUrl: "https://github.com/gesslar/sassy/tree/main/docs/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],

  /** @type {ThemeConfig} */
  themeConfig:
    ({
      colorMode: {
        defaultMode: "dark",
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },

      image: "img/double-s-bg.svg",

      scrollToTop: true,
      scrollToTopOptions: {
        zIndex: 100,
      },

      docs: {
      },

      navbar: {
        title: "Sassy",
        hideOnScroll: false,
        logo: {
          alt: "Sassy Logo",
          src: "img/double-s-bg.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "quickStartSidebar",
            position: "left",
            label: "Quick Start",
          },
          {
            type: "docSidebar",
            sidebarId: "divingDeeperSidebar",
            position: "left",
            label: "Diving Deeper",
          },
          {
            type: "docSidebar",
            sidebarId: "referenceSidebar",
            position: "left",
            label: "Reference",
          },
          {
            type: "docSidebar",
            sidebarId: "hackingSidebar",
            position: "left",
            label: "Hacking",
          },
          {
            type: "html",
            value: `<a href="https://github.com/gesslar/sassy" target="_blank"><img class="header-svg" src="/img/line-md--github-loop.svg" /></a>`,
            position: "right",
          },
          {
            type: "html",
            value: `<a href="/docs/testimonials"><img class="header-svg" src="/img/hugeicons--promotion.svg" /></a>`,
            position: "right",
          },
          {
            type: "html",
            value: `|`,
            position: "right",
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [],
        copyright: `<del title="lololol">Copyright ©${new Date().getFullYear()}</del><br /><a href="https://unlicense.org/">Unlicense</a>. Built with <a href="https://docusaurus.io/">Docusaurus</a>.`,
      },
      prism: {
        additionalLanguages: [
          'powershell',
          'bash',
          'diff',
          'json',
          'yaml',
        ],
        magicComments: [
          {
            className: 'theme-code-block-highlighted-line',
            line: 'highlight-next-line',
            block: { start: 'highlight-start', end: 'highlight-end' },
          },
          {
            className: 'code-block-error-line',
            line: 'This will error',
          },
        ],
        theme: PrismLight,
        darkTheme: PrismDark,
      },
    }),
  clientModules: [
    "./src/clientModules/routeTransition.js",
  ],
  scripts: [
    {
      src: "https://kit.fontawesome.com/9ecaefec6a.js",
      async: true
    }
  ]
}

export default config
