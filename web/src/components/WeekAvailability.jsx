import { useEffect, useState } from 'react';
import { ArrowRight, Calendar, CheckSquare, Minus, Plus, Square } from 'lucide-react';
import { DAYS, DAYS_LONG, DAY_GROUPS, SHIFT_PRESETS } from '../lib/constants';

const hhmm = (t) => (t ? t.slice(0, 5) : '');
const ampm = (t) => {
  const [h, m] = hhmm(t).split(':').map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
};
const presetFor = (start, end) => SHIFT_PRESETS.find((p) => p.start === hhmm(start) && p.end === hhmm(end));
const hoursLabel = (d) => {
  const p = presetFor(d.start, d.end);
  return p ? `${p.label} · ${p.sub}` : `${ampm(d.start)} – ${ampm(d.end)}`;
};

export const weekFromSlots = (slots) => DAYS.map((_, i) => {
  const x = slots.find((s) => s.day === i);
  return x ? { on: true, start: hhmm(x.start_time), end: hhmm(x.end_time) } : { on: false, start: '08:00', end: '17:00' };
});

/** The week as API slots: [{ day, start_time, end_time }] for days that are on. */
export const slotsFromWeek = (week) => week
  .map((d, day) => (d.on ? { day, start_time: d.start, end_time: d.end } : null))
  .filter(Boolean);

/** "Mon–Fri · Daytime · 8am – 5pm", … */
function summarise(week) {
  const groups = [];
  week.forEach((d, i) => {
    if (!d.on) return;
    const key = hoursLabel(d);
    const last = groups[groups.length - 1];
    if (last && last.key === key && last.days[last.days.length - 1] === i - 1) last.days.push(i);
    else groups.push({ key, days: [i] });
  });
  return groups.map((g) => {
    const days = g.days.length > 2 ? `${DAYS[g.days[0]]}–${DAYS[g.days[g.days.length - 1]]}` : g.days.map((i) => DAYS[i]).join(', ');
    return `${days} · ${g.key}`;
  });
}

/**
 * Weekly availability, same as the mobile app:
 *   1. Which days?  Mon–Sun, or Weekdays / Weekends / Every day.
 *   2. What hours?  One shift for all those days: a preset or custom.
 * "Different hours on some days" opens a row per chosen day.
 * Controlled: `week` from weekFromSlots(); save with slotsFromWeek(week).
 */
export default function WeekAvailability({ week, onChange }) {
  const onDays = week.map((d, i) => (d.on ? i : -1)).filter((i) => i >= 0);
  const first = week.find((d) => d.on);
  const mixed = onDays.some((i) => week[i].start !== first.start || week[i].end !== first.end);
  const [perDay, setPerDay] = useState(mixed);
  const [hours, setHours] = useState(() => (first ? { start: first.start, end: first.end } : { start: '08:00', end: '17:00' }));
  const [custom, setCustom] = useState(() => !!first && !presetFor(first.start, first.end));
  useEffect(() => { if (mixed) setPerDay(true); }, [mixed]);

  const setWeek = (fn) => onChange(fn(week));
  const applyHours = (h) => { setHours(h); setWeek((w) => w.map((d) => (d.on ? { ...d, ...h } : d))); };
  const toggleDay = (i) => setWeek((w) => w.map((d, j) => (j === i ? (d.on ? { ...d, on: false } : { on: true, ...hours }) : d)));
  const pickDays = (days) => setWeek((w) => w.map((d, i) => (days.includes(i) ? (d.on ? d : { on: true, ...hours }) : { ...d, on: false })));
  const updateDay = (i, patch) => setWeek((w) => w.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const summary = summarise(week);

  return (
    <div>
      <div className="mb-2 text-sm font-bold text-gray-900">1. Which days can you work?</div>
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((d, i) => (
          <button key={d} type="button" onClick={() => toggleDay(i)} role="checkbox" aria-checked={week[i].on} aria-label={DAYS_LONG[i]}
            className={`rounded-full border-2 py-2.5 text-sm font-bold ${week[i].on ? 'border-brand-700 bg-brand-700 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300'}`}>
            {d}
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {DAY_GROUPS.map((g) => {
          const on = g.days.length === onDays.length && g.days.every((d) => onDays.includes(d));
          return (
            <button key={g.label} type="button" onClick={() => pickDays(on ? [] : g.days)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${on ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300'}`}>
              {g.label}
            </button>
          );
        })}
      </div>

      <div className="mb-2 mt-6 text-sm font-bold text-gray-900">2. What hours?</div>
      {!onDays.length ? (
        <p className="text-xs text-gray-500">Choose your days first.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SHIFT_PRESETS.map((p) => {
              const on = !custom && hours.start === p.start && hours.end === p.end;
              return (
                <button key={p.key} type="button" onClick={() => { setCustom(false); applyHours({ start: p.start, end: p.end }); }}
                  className={`rounded-xl border px-3 py-2.5 text-left ${on ? 'border-brand-700 bg-brand-700 text-white' : 'border-gray-200 bg-white hover:border-brand-300'}`}>
                  <div className="text-sm font-bold">{p.label}</div>
                  <div className={`text-xs font-semibold ${on ? 'text-white/85' : 'text-gray-500'}`}>{p.sub}</div>
                </button>
              );
            })}
            <button type="button" onClick={() => setCustom(true)}
              className={`rounded-xl border px-3 py-2.5 text-left ${custom ? 'border-brand-700 bg-brand-700 text-white' : 'border-gray-200 bg-white hover:border-brand-300'}`}>
              <div className="text-sm font-bold">Custom</div>
              <div className={`text-xs font-semibold ${custom ? 'text-white/85' : 'text-gray-500'}`}>Set your own</div>
            </button>
          </div>
          {custom && (
            <div className="mt-3 flex items-start gap-2.5">
              <TimeStepper label="From" value={hours.start} onChange={(start) => applyHours({ ...hours, start })} />
              <ArrowRight className="mt-8 h-4 w-4 shrink-0 text-gray-400" />
              <TimeStepper label="To" value={hours.end} onChange={(end) => applyHours({ ...hours, end })} />
            </div>
          )}

          <button type="button" onClick={() => setPerDay((v) => !v)} className="mt-4 flex items-center gap-2 text-sm font-bold text-brand-700">
            {perDay ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />} Different hours on some days
          </button>
          {perDay && (
            <div className="mt-2.5 divide-y divide-gray-100 rounded-xl border border-gray-100 px-3">
              {onDays.map((i) => (
                <div key={i} className="py-3">
                  <div className="mb-2 text-sm font-semibold text-gray-800">
                    {DAYS_LONG[i]} · <span className="text-brand-700">{hoursLabel(week[i])}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SHIFT_PRESETS.map((p) => {
                      const on = p.start === week[i].start && p.end === week[i].end;
                      return (
                        <button key={p.key} type="button" onClick={() => updateDay(i, { start: p.start, end: p.end })}
                          className={`rounded-full border px-2.5 py-1.5 text-xs font-bold ${on ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700'}`}>
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex gap-2 rounded-xl bg-gray-50 p-2.5 text-xs text-gray-600">
        <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
        <div className="whitespace-pre-line">{summary.length ? summary.join('\n') : 'No days chosen yet.'}</div>
      </div>
    </div>
  );
}

/** Half-hour steps; shows 12-hour time. */
function TimeStepper({ label, value, onChange }) {
  const step = (dir) => {
    const [h, m] = value.split(':').map(Number);
    const mins = (((h * 60 + m + dir * 30) % 1440) + 1440) % 1440;
    onChange(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
  };
  return (
    <div className="flex-1">
      <div className="mb-1.5 text-xs font-bold text-gray-500">{label}</div>
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5">
        <button type="button" onClick={() => step(-1)} className="text-brand-700" aria-label={`${label} earlier`}><Minus className="h-4 w-4" /></button>
        <span className="text-sm font-extrabold text-gray-900">{ampm(value)}</span>
        <button type="button" onClick={() => step(1)} className="text-brand-700" aria-label={`${label} later`}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
