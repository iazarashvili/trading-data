import type { FC } from 'hono/jsx'
import { ThemeToggle } from './Layout'

export const Login: FC<{ next?: string }> = ({ next = '/' }) => (
  <div class="min-h-[70vh] flex items-center justify-center">
    <div class="w-full max-w-sm">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <span class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white text-sm font-bold">
            TJ
          </span>
          <span>Trading Journal</span>
        </div>
        <ThemeToggle />
      </div>

      <form
        method="post"
        action="/login"
        class="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card p-6 shadow-sm space-y-4"
      >
        <input type="hidden" name="next" value={next} />

        <div>
          <label for="password" class="block text-sm font-medium mb-1.5">
            პაროლი
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            autofocus
            autocomplete="current-password"
            class="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 focus:ring-2 focus:ring-accent focus:border-transparent outline-none text-sm"
          />
        </div>

        <button
          type="submit"
          class="w-full px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition"
        >
          შესვლა
        </button>
      </form>

      <p class="mt-4 text-center text-xs text-slate-500">
        ეს ჟურნალი პირადია — წვდომა მხოლოდ პაროლით.
      </p>
    </div>
  </div>
)
