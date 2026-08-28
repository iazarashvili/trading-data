/**
 * დროის ზონა: Cloudflare Workers ყოველთვის UTC-ზე მუშაობს, ამიტომ
 * „ახლა"-ს ყველგან ხელით ვწევთ თბილისის დროზე (UTC+4).
 */
const TZ_OFFSET_MS = 4 * 60 * 60 * 1000

const pad = (n: number): string => String(n).padStart(2, '0')

function tbilisiNow(): Date {
  return new Date(Date.now() + TZ_OFFSET_MS)
}

/** `YYYY-MM-DD HH:MM:SS` თბილისის დროით */
export function nowTimestamp(): string {
  const d = tbilisiNow()
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    ` ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  )
}

/** მიმდინარე თვე `YYYY-MM` თბილისის დროით */
export function currentMonthId(): string {
  const d = tbilisiNow()
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

const MONTHS_KA = [
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
]

/** `2026-08` -> `აგვისტო 2026` */
export function monthLabel(monthId: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthId)
  if (!m) return monthId
  const index = Number(m[2]) - 1
  if (index < 0 || index > 11) return monthId
  return `${MONTHS_KA[index]} ${m[1]}`
}

export function isValidMonthId(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

/**
 * ნებისმიერი შემომავალი ფორმატი -> `YYYY-MM-DD HH:MM:SS`
 * `2026-07-18T14:05` -> `2026-07-18 14:05:00`
 */
export function normalizeDateTime(value: string): string {
  let s = value.trim().replace('T', ' ').slice(0, 19)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) s += ':00'
  return s
}

/** `<input type="datetime-local">`-ისთვის: `2026-07-18T14:05` */
export function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(' ', 'T').slice(0, 16)
}

/** ეკრანზე საჩვენებელი სახე */
export function displayDateTime(value: string | null | undefined, length = 16): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, length)
}

/** ტრეიდის თვე `YYYY-MM` */
export function monthOf(tradeDatetime: string | null | undefined): string | null {
  if (!tradeDatetime || tradeDatetime.length < 7) return null
  return tradeDatetime.slice(0, 7)
}
