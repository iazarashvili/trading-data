import { raw } from 'hono/html'
import type { Child, FC } from 'hono/jsx'
import type { Flash } from '../lib/flash'

const TAILWIND_CONFIG = `
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#0f1419', light: '#f8fafc' },
        card: { DEFAULT: '#1a2332', light: '#ffffff' },
        accent: { DEFAULT: '#3b82f6', hover: '#2563eb' },
      }
    }
  }
}`

const THEME_SCRIPT = `
(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
  }
  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      root.classList.toggle('dark');
      localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light');
      if (document.getElementById('equityChart')) {
        setTimeout(function () { location.reload(); }, 50);
      }
    });
  });
})();`

const BASE_STYLES = `
[x-cloak] { display: none !important; }
input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
.dark input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1); }`

/** გვერდითი მენიუს პუნქტები */
export type NavKey = 'history' | 'killzones'

interface LayoutProps {
  title?: string
  flashes?: Flash[]
  head?: Child
  scripts?: Child
  /** login გვერდისთვის — nav-ის გარეშე */
  bare?: boolean
  /** გვერდითი მენიუს აქტიური პუნქტი */
  activeNav?: NavKey
  children?: Child
}

export const Layout: FC<LayoutProps> = ({
  title = 'Trading Journal',
  flashes = [],
  head,
  scripts,
  bare = false,
  activeNav,
  children,
}) => (
  <>
    {raw('<!DOCTYPE html>')}
    <html lang="ka" class="h-full">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{ __html: TAILWIND_CONFIG }}></script>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}></script>
        <style dangerouslySetInnerHTML={{ __html: BASE_STYLES }}></style>
        {head}
      </head>
      <body class="h-full bg-slate-50 text-slate-900 dark:bg-surface dark:text-slate-100 transition-colors duration-200">
        {!bare && (
          <nav class="border-b border-slate-200 dark:border-slate-700/60 bg-white/80 dark:bg-card/80 backdrop-blur sticky top-0 z-40">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
              <a href="/" class="flex items-center gap-2 font-semibold text-lg tracking-tight">
                <span class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white text-sm font-bold">
                  TJ
                </span>
                <span class="hidden sm:inline">Trading Journal</span>
              </a>
              <div class="flex items-center gap-3">
                <a
                  href="/trade/new"
                  class="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span class="hidden sm:inline">ახალი ტრეიდი</span>
                </a>
                <ThemeToggle />
                <form method="post" action="/logout">
                  <button
                    type="submit"
                    class="p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                    aria-label="გასვლა"
                    title="გასვლა"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </nav>
        )}

        {!bare && <MobileNav active={activeNav} />}

        <div class="flex">
          {!bare && <Sidebar active={activeNav} />}
          <main class="flex-1 min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <FlashMessages flashes={flashes} />
            {children}
          </main>
        </div>

        {scripts}
      </body>
    </html>
  </>
)

export const ThemeToggle: FC = () => (
  <button
    id="theme-toggle"
    type="button"
    class="p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
    aria-label="თემის გადართვა"
  >
    <svg class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
    <svg class="w-5 h-5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  </button>
)

const FlashMessages: FC<{ flashes: Flash[] }> = ({ flashes }) => {
  if (!flashes.length) return <></>

  return (
    <div class="mb-6 space-y-2">
      {flashes.map((flash) => (
        <div
          class={
            'px-4 py-3 rounded-lg text-sm ' +
            (flash.category === 'error'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20')
          }
        >
          {flash.message}
        </div>
      ))}
    </div>
  )
}

const NAV_ITEMS: { key: NavKey; href: string; label: string; icon: string }[] = [
  {
    key: 'history',
    href: '/',
    label: 'ისტორია',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    key: 'killzones',
    href: '/killzones',
    label: 'ICT Killzones',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
]

const Sidebar: FC<{ active?: NavKey }> = ({ active }) => (
  <aside class="hidden sm:block shrink-0 w-16 lg:w-56 border-r border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-card/40 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
    <nav class="p-2 lg:p-3 space-y-1">
      {NAV_ITEMS.map((item) => (
        <a
          href={item.href}
          title={item.label}
          aria-current={active === item.key ? 'page' : undefined}
          class={
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ' +
            'justify-center lg:justify-start ' +
            (active === item.key
              ? 'bg-accent/10 text-accent dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50')
          }
        >
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d={item.icon}
            />
          </svg>
          <span class="hidden lg:inline truncate">{item.label}</span>
        </a>
      ))}
    </nav>
  </aside>
)

/** მობილურზე (sm-მდე) sidebar-ის ნაცვლად ჰორიზონტალური ზოლი — კონტენტს სიგანეს არ ართმევს */
const MobileNav: FC<{ active?: NavKey }> = ({ active }) => (
  <nav class="sm:hidden sticky top-14 z-30 flex border-b border-slate-200 dark:border-slate-700/60 bg-white/90 dark:bg-card/90 backdrop-blur">
    {NAV_ITEMS.map((item) => (
      <a
        href={item.href}
        aria-current={active === item.key ? 'page' : undefined}
        class={
          'flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition ' +
          (active === item.key
            ? 'border-accent text-accent dark:text-blue-400'
            : 'border-transparent text-slate-600 dark:text-slate-300')
        }
      >
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
        </svg>
        {item.label}
      </a>
    ))}
  </nav>
)
