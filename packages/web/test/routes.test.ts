// Routes after the move of the app to /app (ADR-006, marketing-site MS-1, MS-2, MS-3.5, MS-11.3).
// Config and tooling files are read as text; the pages are imported.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import * as home from '@/app/page';
import AppPage from '@/app/app/page';
import robots from '@/app/robots';

const web = (rel: string) => resolve(__dirname, '..', rel);
const repo = (rel: string) => resolve(__dirname, '../../..', rel);
const read = (path: string) => readFileSync(path, 'utf8');

/** The href of the `<a>` whose text (after whitespace is collapsed) is `text`, read from TSX source. */
function hrefOf(source: string, text: string): string[] {
  const out: string[] = [];
  // A plain <a>, or the app's WebsiteLink (a new-tab <a>, web-ui Req 36.7).
  const re = /<(?:a|WebsiteLink)\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/(?:a|WebsiteLink)>/g;
  for (const m of source.matchAll(re)) if ((m[2] ?? '').replace(/\s+/g, ' ').trim() === text) out.push(m[1] ?? '');
  return out;
}

describe('routes (ADR-006)', () => {
  it('MS-1.1 / (the website) is statically rendered', () => {
    expect(home.dynamic).toBe('force-static');
  });

  it('MS-1.2 /app renders the communication screen', () => {
    expect(AppPage().type).toBe(CommunicationScreen);
  });

  it('MS-1.3 /welcome is gone and redirects permanently to /', () => {
    expect(existsSync(web('app/welcome/page.tsx'))).toBe(false);
    const config = read(web('next.config.mjs'));
    expect(config).toMatch(/async redirects\(\)/);
    expect(config).toMatch(/\{\s*source:\s*'\/welcome',\s*destination:\s*'\/',\s*permanent:\s*true\s*\}/);
  });

  it('MS-1.4 /about (site look since W3, 2026-11-12): the bar brand goes to /, "Open the app" to /app, the demo link to /', () => {
    const about = read(web('app/about/page.tsx'));
    expect(about).toContain('<SiteBar home="/" />');
    expect(about).toContain('<SiteFooter home="/" statement={false} />');
    expect(hrefOf(read(web('components/site/SiteBar.tsx')), 'Open the app')).toEqual(['/app']);
    expect(hrefOf(about, 'See the demo, the measured results and the source code')).toEqual(['/']);
    expect(hrefOf(about, 'Back to the keypad')).toEqual([]);
    expect(about).not.toContain('/welcome');
  });

  it('MS-1.5 the app links "How Ninth Life works" to / (Settings > About, web-ui Req 37.1)', () => {
    const menu = read(web('components/SettingsSheet.tsx'));
    expect(hrefOf(menu, 'How Ninth Life works')).toEqual(['/']);
    expect(menu).not.toContain('/welcome');
  });

  it('MS-1.7 test tooling, CI and agents open the app at /app', () => {
    expect(read(web('test/e2e/lib.mjs'))).toMatch(/export async function openApp\(page, path = '\/app'\)/);
    const axe = read(web('test/e2e/axe.mjs'));
    expect(axe).not.toMatch(/path: '\/',[^}]*app: true/);
    expect(axe).not.toContain('/welcome');
    expect(read(repo('.github/workflows/ci.yml'))).toContain('"$BASE_URL/app"');
    const auditor = JSON.parse(read(repo('.kiro/agents/a11y-auditor.json')));
    expect(auditor.prompt).toContain('http://localhost:3000/app');
    expect(auditor.welcomeMessage).toContain('http://localhost:3000/app');
    expect(read(repo('.kiro/workflows/ship-feature.workflow.json'))).toContain('Audit the Ninth Life app at http://localhost:3000/app');
  });

  it('MS-2.1 the installed app starts at /app; id and scope stay /', () => {
    const manifest = JSON.parse(read(web('public/manifest.webmanifest')));
    expect(manifest.start_url).toBe('/app');
    expect(manifest.id).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.orientation).toBe('any');
  });

  it('MS-2.2 the worker precaches /, /app and /about, not /welcome', () => {
    const config = read(web('next.config.mjs'));
    const entries = config.match(/additionalPrecacheEntries:\s*\[([^\]]*)\]/)?.[1] ?? '';
    const urls = [...entries.matchAll(/url:\s*'([^']*)'/g)].map((m) => m[1] ?? '');
    expect(urls).toEqual(['/', '/app', '/about']);
  });

  it('MS-2.3 an uncached document offline falls back to /app', () => {
    const sw = read(web('app/sw.ts'));
    expect(sw).toMatch(/entries:\s*\[\{\s*url:\s*'\/app',\s*matcher:/);
    expect(sw).not.toMatch(/url:\s*'\/',/);
  });

  it('MS-3.5 robots.txt allows every page', () => {
    const r = robots();
    expect(r.rules).toEqual({ userAgent: '*', allow: '/' });
  });

  it('MS-10.6 the website keeps content inside the safe areas', () => {
    const css = read(web('components/site/site.css'));
    expect(css).toContain('env(safe-area-inset-left)');
    expect(css).toContain('env(safe-area-inset-right)');
  });

  it('MS-11.3 app.css is loaded by /app only, not by the layout, the website or /about', () => {
    const imports = (rel: string) => [...read(web(rel)).matchAll(/^import\s+['"]([^'"]+)['"];?$/gm)].map((m) => m[1] ?? '');
    const appCss = (rel: string) => imports(rel).some((s) => /styles\/app\.css$/.test(s));
    expect(appCss('app/layout.tsx')).toBe(false);
    expect(appCss('app/page.tsx')).toBe(false);
    expect(appCss('app/app/page.tsx')).toBe(true);
    // W3 (2026-11-12): /about uses the website's stylesheet instead.
    expect(appCss('app/about/page.tsx')).toBe(false);
    expect(imports('app/about/page.tsx')).toContain('@/components/site/site.css');
  });
});
