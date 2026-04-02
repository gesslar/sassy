import {defineConfig} from "astro/config"
import starlight from "@astrojs/starlight"

export default defineConfig({
  site: "https://sassy.gesslar.io",
  integrations: [
    starlight({
      title: "sassy",
      logo: {
        src: "./src/assets/double-s-bg.svg",
      },
      favicon: "/double-s-bg.svg",
      social: [
        {icon: "github", label: "GitHub", href: "https://github.com/gesslar/sassy"},
      ],
      components: {
        SocialIcons: "./src/components/SocialIcons.astro",
      },
      customCss: [
        "./src/styles/custom.css",
      ],
      sidebar: [
        {
          label: "Quick Start",
          autogenerate: {directory: "quick-start"},
        },
        {
          label: "Diving Deeper",
          autogenerate: {directory: "diving-deeper"},
        },
        {
          label: "Reference",
          autogenerate: {directory: "reference"},
        },
        {
          label: "Theme School",
          autogenerate: {directory: "theme-school"},
        },
        {
          label: "Hacking",
          autogenerate: {directory: "hacking"},
        },
        {
          label: "More",
          items: [
            {slug: "features"},
            {slug: "sassy-but-gui"},
            {slug: "hex"},
            {slug: "testimonials"},
          ],
        },
      ],
    }),
  ],
})
