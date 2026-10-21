import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { kes } from '../../lib/format';

/** Value that settles `ms` after the last change (for search boxes). */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export const pct = (x) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);

export function SearchBox({ value, onChange, placeholder = 'Search' }) {
  return (
    <label className="relative block w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
      />
    </label>
  );
}

export function Select({ value, onChange, options, label }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Prev / next for DRF page-number pagination. */
export function Pager({ page, count, pageSize = 25, onPage }) {
  const pages = Math.max(1, Math.ceil((count || 0) / pageSize));
  if (pages <= 1) return null;
  const btn = 'inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40';
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
      <span>Page {page} of {pages} · {count} total</span>
      <div className="flex gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-4 w-4" />Previous</button>
        <button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next<ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/** A table that scrolls sideways on phones instead of pushing the page wider. */
export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
      <table className="w-full min-w-[720px] whitespace-nowrap text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/70 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-50">{children}</tbody>
      </table>
    </div>
  );
}

/**
 * Daily bar chart drawn in SVG. `rows` = [{date, value}], `money` formats values as KES.
 * Hover or tap a bar to read its value.
 */
export function TrendChart({ rows, money = false, label }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 200, padL = 44, padB = 26, padT = 12, padR = 8;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const ticks = useMemo(() => niceTicks(max), [max]);
  const top = ticks[ticks.length - 1];
  const plotW = width - padL - padR, plotH = H - padT - padB;
  const step = plotW / Math.max(rows.length, 1);
  const barW = Math.max(2, Math.min(22, step * 0.7));
  const y = (v) => padT + plotH - (v / top) * plotH;
  const fmt = (v) => (money ? kes(v) : Number(v).toLocaleString('en-KE'));
  const short = (v) => (money && v >= 1000 ? `${Math.round(v / 1000)}k` : v.toLocaleString('en-KE'));
  const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  const every = Math.ceil(rows.length / Math.max(2, Math.floor(plotW / 70)));
  const total = rows.reduce((s, r) => s + r.value, 0);
  const h = hover !== null ? rows[hover] : null;

  return (
    <div ref={ref} className="relative">
      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="tabular-nums text-gray-500">
          {h ? <><b className="text-gray-900">{fmt(h.value)}</b> on {dayLabel(h.date)}</> : <>Total <b className="text-gray-900">{fmt(total)}</b></>}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`${label}, ${rows.length} days`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="#EEF0F4" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{short(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cx = padL + step * i + step / 2;
          return (
            <g key={r.date} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
              <rect x={cx - step / 2} y={padT} width={step} height={plotH} fill="transparent" />
              <rect x={cx - barW / 2} y={y(r.value)} width={barW} height={Math.max(0, padT + plotH - y(r.value))} rx="3"
                fill={hover === i ? '#4A0E8F' : '#8F5FD3'} />
              {i % every === 0 && (
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B7280">{dayLabel(r.date)}</text>
              )}
            </g>
          );
        })}
        <line x1={padL} x2={width - padR} y1={padT + plotH} y2={padT + plotH} stroke="#D1D5DB" />
      </svg>
    </div>
  );
}

function niceTicks(max) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
  const nice = Math.max(1, step >= 1 ? Math.ceil(step) : 1);
  const out = [];
  for (let v = 0; v <= max + nice - 1e-9; v += nice) out.push(v);
  if (out.length < 2) out.push(nice);
  return out;
}

/** One bar split into labelled parts, with a legend. */
export function SplitBar({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
        {total > 0 && parts.map((p) => p.value > 0 && (
          <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-gray-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="truncate">{p.label}</span>
            <b className="ml-auto tabular-nums text-gray-900">{p.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
