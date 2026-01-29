import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import Heading from '@theme/Heading';
import {useEffect, useRef, useState, useCallback} from 'react';

import styles from './index.module.css';

const beforeCode = `{
  "editor.background": "#1e1e1e",
  "editor.foreground": "#e6e6e6",
  "statusBar.background": "#002e63",
  "panel.background": "#1a1a1a",
  "sideBar.background": "#252526",
  "activityBar.background": "#333333",
  "tab.activeBackground": "#1e1e1e",
  "tab.inactiveBackground": "#2d2d2d",
  "focusBorder": "#007fd4",
  "errorForeground": "#f44747"
}`;

const afterCode = `vars:
  accent: "#4a9eff"
  std:
    fg: "#e6e6e6"
    bg: "#1a1a2e"
    bg.panel: lighten($(std.bg), 15)
    bg.accent: darken($(accent), 70)
    outline: fade($(accent), 30)

theme:
  colors:
    editor.background: $(std.bg.panel)
    editor.foreground: $(std.fg)
    statusBar.background: $(std.bg.accent)
    focusBorder: $(std.outline)`;

const features = [
  {
    title: 'Semantic Variables',
    description: 'Name your colours by what they mean, not what they look like. Change one value and watch it cascade through your entire theme.',
    icon: '$()',
  },
  {
    title: 'Colour Functions',
    description: 'Derive shades with lighten(), darken(), fade(), mix(), and more. Powered by Culori for perceptually accurate results.',
    icon: 'f()',
  },
  {
    title: 'Resolve & Debug',
    description: 'Trace any colour from expression to final hex. See exactly how variables chain, where functions apply, and why a value resolved the way it did.',
    icon: '->',
  },
  {
    title: 'Any Colour Space',
    description: 'Hex, RGB, HSL, OKLCH, CSS named colours — use whatever makes sense. Sassy converts everything to hex for VS Code.',
    icon: 'oklch',
  },
  {
    title: 'Built-in Linting',
    description: 'Catch duplicate scopes, undefined variables, unused definitions, and precedence issues before they become visual bugs.',
    icon: 'lint',
  },
  {
    title: 'Watch Mode',
    description: 'Live rebuilds on save. Smart hash-based output skipping. Point --output-dir at your extensions folder and iterate instantly.',
    icon: '--w',
  },
];

const NPX_COMMAND = 'npx @gesslar/sassy build my-theme.yaml';

function CopyButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(NPX_COMMAND).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <button
      className={styles.copyButton}
      onClick={handleCopy}
      title="Copy to clipboard"
      aria-label="Copy command to clipboard">
      {copied ? '✓' : '⎘'}
    </button>
  );
}

function useScrollShrink() {
  const [shrunk, setShrunk] = useState(false);

  useEffect(() => {
    const shrinkAt = 80;
    const unshrinkAt = 40;
    let ticking = false;

    const onScroll = () => {
      if(!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          setShrunk(prev => {
            if(!prev && y > shrinkAt) return true;
            if(prev && y < unshrinkAt) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return shrunk;
}

function useScrollReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if(!el) return;

    const observer = new IntersectionObserver(
      entries => {
        for(const entry of entries) {
          entry.target.classList.toggle(styles.revealed, entry.isIntersecting);
        }
      },
      {threshold: 0.15, rootMargin: '0px 0px -100px 0px'}
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function RevealSection({children, className, ...props}) {
  const ref = useScrollReveal();
  return (
    <section ref={ref} className={clsx(styles.revealSection, className)} {...props}>
      {children}
    </section>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const shrunk = useScrollShrink();

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner, shrunk && styles.heroBannerShrunk)}>
      <div className={clsx('container', styles.heroInner)}>
        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>
        <p className={clsx(styles.heroSubtitle, shrunk && styles.heroSubtitleShrunk)}>
          {siteConfig.tagline}
        </p>
        <div className={clsx(styles.heroCollapsible, shrunk && styles.heroCollapsibleHidden)}>
          <p className={styles.heroTagline}>
            Stop wrestling with 800+ disconnected hex codes.<br />
            Write themes with variables, functions, and design systems that actually make sense.
          </p>
        </div>
        <div className={clsx(styles.buttons, shrunk && styles.buttonsShrunk)}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/quick-start/intro">
            Get Started
          </Link>
          <Link
            className={clsx("button button--outline button--lg", styles.buttonOutline)}
            to="/docs/reference/theme-file">
            Reference
          </Link>
        </div>
        <div className={clsx(styles.install, shrunk && styles.installShrunk)}>
          <code>{NPX_COMMAND}</code>
          <CopyButton />
        </div>
      </div>
    </header>
  );
}

function BeforeAfter() {
  return (
    <RevealSection className={styles.beforeAfter}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Write themes like a human
        </Heading>
        <div className={styles.codeComparison}>
          <div className={styles.codeBlock}>
            <div className={styles.codeLabel}>Before — raw VS Code JSON</div>
            <CodeBlock language="json">{beforeCode}</CodeBlock>
          </div>
          <div className={styles.codeBlock}>
            <div className={styles.codeLabel}>After — Sassy</div>
            <CodeBlock language="yaml">{afterCode}</CodeBlock>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

function Feature({title, description, icon}) {
  return (
    <div className={styles.feature}>
      <div className={styles.featureIcon}>{icon}</div>
      <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}

function Features() {
  return (
    <RevealSection className={styles.features}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Express yourself
        </Heading>
        <div className={styles.featureGrid}>
          {features.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </RevealSection>
  );
}

function Audiences() {
  return (
    <RevealSection className={styles.audiences}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Pick your path
        </Heading>
        <div className={styles.audienceGrid}>
          <Link to="/docs/quick-start/intro" className={styles.audienceCard}>
            <Heading as="h3">Quick Start</Heading>
            <p>Build your first theme from scratch in seven short pages. No experience required.</p>
          </Link>
          <Link to="/docs/diving-deeper/imports" className={styles.audienceCard}>
            <Heading as="h3">Diving Deeper</Heading>
            <p>Imports, design systems, multiple themes, advanced colour functions, linting, and debugging.</p>
          </Link>
          <Link to="/docs/reference/theme-file" className={styles.audienceCard}>
            <Heading as="h3">Reference</Heading>
            <p>Complete specifications for every feature, function, CLI command, and API class.</p>
          </Link>
          <Link to="/docs/hacking/dev-setup" className={styles.audienceCard}>
            <Heading as="h3">Hacking</Heading>
            <p>Architecture internals, compilation pipeline, extending Sassy with new functions and output formats.</p>
          </Link>
        </div>
      </div>
    </RevealSection>
  );
}

/**
 * The home page!
 */
export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Make gorgeous themes that speak as boldly as you do.">
      <HomepageHeader />
      <main>
        <BeforeAfter />
        <Features />
        <Audiences />
      </main>
    </Layout>
  );
}
