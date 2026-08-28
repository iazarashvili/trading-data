import type { FC } from 'hono/jsx'

/**
 * ICT killzone-ები განსაზღვრულია ნიუ-იორკის დროით (EST/EDT) — ეს ICT-ის
 * სტანდარტული მითითებაა. ლოკალურ დროზე გადაყვანა ბრაუზერში ხდება, რომ
 * ზაფხულის/ზამთრის დროზე გადასვლა (DST) ავტომატურად გაითვალისწინოს.
 */
interface Killzone {
  name: string
  /** ნიუ-იორკის შუაღამიდან წუთებში (1440 = შუაღამე მეორე დღეს) */
  startMin: number
  endMin: number
  note: string
}

const hm = (hour: number, minute = 0): number => hour * 60 + minute

const KILLZONES: Killzone[] = [
  {
    name: 'Asian',
    startMin: hm(20),
    endMin: hm(24),
    note: 'აზიური დიაპაზონი — ვიწრო მოძრაობა, ლიკვიდობის დაგროვება',
  },
  {
    name: 'London',
    startMin: hm(2),
    endMin: hm(5),
    note: 'ყველაზე მაღალი ვოლატილობა ვალუტებზე; დღის high/low ხშირად აქ იწერება',
  },
  {
    name: 'New York AM',
    startMin: hm(7),
    endMin: hm(10),
    note: 'ლონდონთან overlap — მაქსიმალური ლიკვიდობა, ინდექსები და ოქრო',
  },
  {
    name: 'New York PM',
    startMin: hm(13, 30),
    endMin: hm(16),
    note: 'შუადღის შესვენების შემდეგ — reversal ან დღის ტრენდის გაგრძელება',
  },
]

const clock = (minutes: number): string =>
  String(Math.floor(minutes / 60) % 24).padStart(2, '0') +
  ':' +
  String(minutes % 60).padStart(2, '0')

const CLOCK_SCRIPT = `
(function () {
  var NY = 'America/New_York';

  function parts(timeZone, date) {
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var out = {};
    dtf.formatToParts(date).forEach(function (part) { out[part.type] = part.value; });
    return out;
  }

  /** ზონის განსხვავება UTC-სგან მილიწამებში (DST-ის გათვალისწინებით) */
  function tzOffset(timeZone, date) {
    var p = parts(timeZone, date);
    var asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
    return asUTC - date.getTime();
  }

  function hhmm(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function human(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    return (h > 0 ? h + 'სთ ' : '') + m + 'წთ ' + s + 'წმ';
  }

  var rows = Array.prototype.slice.call(document.querySelectorAll('[data-kz]'));
  var nyClock = document.getElementById('ny-clock');
  var localClock = document.getElementById('local-clock');
  var status = document.getElementById('kz-status');

  function tick() {
    var now = new Date();
    var offset = tzOffset(NY, now);
    var p = parts(NY, now);

    if (nyClock) nyClock.textContent = p.hour + ':' + p.minute + ':' + p.second;
    if (localClock) {
      localClock.textContent = hhmm(now.getTime()) + ':' + String(now.getSeconds()).padStart(2, '0');
    }

    var active = null;
    var next = null;

    rows.forEach(function (row) {
      var startMin = Number(row.getAttribute('data-start'));
      var endMin = Number(row.getAttribute('data-end'));

      // ნიუ-იორკის "კედლის დროიდან" რეალურ მომენტში გადაყვანა
      var start = Date.UTC(p.year, p.month - 1, p.day, 0, startMin, 0) - offset;
      var end = Date.UTC(p.year, p.month - 1, p.day, 0, endMin, 0) - offset;

      var localCell = row.querySelector('[data-local]');
      if (localCell) localCell.textContent = hhmm(start) + ' - ' + hhmm(end);

      var isActive = now.getTime() >= start && now.getTime() < end;
      row.classList.toggle('ring-2', isActive);
      row.classList.toggle('ring-accent', isActive);
      row.classList.toggle('bg-accent/5', isActive);

      var badge = row.querySelector('[data-badge]');
      if (badge) badge.classList.toggle('hidden', !isActive);

      if (isActive && !active) active = { name: row.getAttribute('data-kz'), end: end };

      var upcoming = start > now.getTime() ? start : start + 86400000;
      if (!next || upcoming < next.start) next = { name: row.getAttribute('data-kz'), start: upcoming };
    });

    if (!status) return;
    if (active) {
      status.innerHTML = '<span class="text-accent dark:text-blue-400 font-semibold">' +
        active.name + '</span> - აქტიურია, დარჩა ' + human(active.end - now.getTime());
    } else if (next) {
      status.innerHTML = 'ამჟამად killzone არ არის. შემდეგი: <span class="font-semibold">' +
        next.name + '</span> - ' + human(next.start - now.getTime()) + 'ში';
    }
  }

  tick();
  setInterval(tick, 1000);
})();`

export const Killzones: FC = () => (
  <>
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">ICT Killzones</h1>
      <p class="mt-1 text-slate-500 dark:text-slate-400 text-sm">
        სავაჭრო ფანჯრები ნიუ-იორკის დროით, გადაყვანილი შენს ლოკალურ დროზე
      </p>
    </div>

    <section class="mb-6 grid gap-4 sm:grid-cols-2">
      <div class="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card p-5 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          ნიუ-იორკი (ICT-ის დრო)
        </p>
        <p id="ny-clock" class="mt-1 text-3xl font-bold tabular-nums">
          --:--:--
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card p-5 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">შენი დრო</p>
        <p id="local-clock" class="mt-1 text-3xl font-bold tabular-nums">
          --:--:--
        </p>
      </div>
    </section>

    <p
      id="kz-status"
      class="mb-6 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card px-5 py-4 text-sm shadow-sm"
    >
      იტვირთება…
    </p>

    <div class="space-y-3">
      {KILLZONES.map((zone) => (
        <div
          data-kz={zone.name}
          data-start={String(zone.startMin)}
          data-end={String(zone.endMin)}
          class="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card p-5 shadow-sm transition"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-semibold">{zone.name}</h2>
                <span
                  data-badge=""
                  class="hidden px-2 py-0.5 rounded-md text-[11px] font-medium bg-accent/10 text-accent dark:text-blue-400 border border-accent/20"
                >
                  ● აქტიური
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{zone.note}</p>
            </div>
            <div class="w-full sm:w-auto text-left sm:text-right shrink-0">
              <p class="text-sm tabular-nums font-medium" data-local="">
                --:-- - --:--
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                NY {clock(zone.startMin)} - {clock(zone.endMin)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>

    <p class="mt-6 text-xs text-slate-500 dark:text-slate-400">
      დროები ბრაუზერის დროის სარტყელში გადაითვლება; ნიუ-იორკის ზაფხულის/ზამთრის დროზე გადასვლა
      (DST) გათვალისწინებულია.
    </p>

    <script dangerouslySetInnerHTML={{ __html: CLOCK_SCRIPT }}></script>
  </>
)
