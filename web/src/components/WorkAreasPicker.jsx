import { useState } from 'react';
import { Check, CheckSquare, ChevronDown, ChevronUp, MapPin, PlusCircle, Search, Square, X, XCircle } from 'lucide-react';
import { AREAS, AREA_COUNTIES, countyOf } from '../lib/constants';

const known = (name) => AREAS.find((a) => a.name.toLowerCase() === name.toLowerCase());

/**
 * Work areas, grouped by county (same as the mobile app's WorkAreasPicker):
 * search, open a county, tap areas or "Anywhere in <county>" to take all of them,
 * and add an area that isn't listed. Controlled: value = ['Kilimani', 'Karen', ...].
 */
export default function WorkAreasPicker({ value = [], onChange }) {
  const [query, setQuery] = useState('');
  const selected = new Set(value.map((v) => v.toLowerCase()));
  // Counties already used start open, so a returning caregiver sees their picks.
  const [open, setOpen] = useState(() => {
    const used = new Set(value.filter(known).map((v) => countyOf(known(v).name)));
    return used.size ? used : new Set(['Nairobi']);
  });
  const q = query.trim().toLowerCase();
  const matches = q ? AREAS.filter((a) => a.name.toLowerCase().includes(q) || countyOf(a.name).toLowerCase().includes(q)) : AREAS;
  const exact = AREAS.some((a) => a.name.toLowerCase() === q) || selected.has(q);
  const custom = value.filter((v) => !known(v));

  const toggle = (name) => onChange(selected.has(name.toLowerCase())
    ? value.filter((v) => v.toLowerCase() !== name.toLowerCase())
    : [...value, name]);
  const setCounty = (county, on) => {
    const names = AREAS.filter((a) => countyOf(a.name) === county).map((a) => a.name);
    const rest = value.filter((v) => !names.some((n) => n.toLowerCase() === v.toLowerCase()));
    onChange(on ? [...rest, ...names] : rest);
  };
  const flip = (county) => setOpen((o) => { const n = new Set(o); n.has(county) ? n.delete(county) : n.add(county); return n; });
  const addCustom = () => {
    const name = query.trim().replace(/\s+/g, ' ');
    if (name.length < 2) return;
    if (!selected.has(name.toLowerCase())) onChange([...value, name]);
    setQuery('');
  };
  const onEnter = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (matches.length === 1) { toggle(matches[0].name); setQuery(''); } else if (!exact) addCustom();
  };

  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 focus-within:border-brand-500">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onEnter}
          placeholder="Search an area or county" className="w-full bg-transparent py-2.5 text-sm outline-none"
          aria-label="Search an area or county" />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600" aria-label="Clear search">
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
      {q && !exact && (
        <button type="button" onClick={addCustom}
          className="mt-2 flex w-full items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm font-bold text-brand-700">
          <PlusCircle className="h-4 w-4" /> Add "{query.trim()}"
        </button>
      )}

      <div className="mt-3 space-y-2">
        {AREA_COUNTIES.map((county) => {
          const all = AREAS.filter((a) => countyOf(a.name) === county);
          const list = matches.filter((a) => countyOf(a.name) === county);
          if (!all.length || (q && !list.length)) return null;
          const count = all.filter((a) => selected.has(a.name.toLowerCase())).length;
          const everywhere = count === all.length;
          const isOpen = !!q || open.has(county);
          return (
            <div key={county} className={`rounded-xl border bg-white ${count ? 'border-brand-300' : 'border-gray-200'}`}>
              <button type="button" onClick={() => flip(county)} aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-4 py-3 text-left">
                <MapPin className={`h-4 w-4 ${count ? 'text-brand-700' : 'text-gray-400'}`} />
                <span className="flex-1 text-sm font-bold text-gray-900">{county}</span>
                <span className={`text-xs font-semibold ${count ? 'text-brand-700' : 'text-gray-500'}`}>
                  {everywhere ? 'Anywhere' : count ? `${count} area${count === 1 ? '' : 's'}` : ''}
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3">
                  {!q && (
                    <button type="button" onClick={() => setCounty(county, !everywhere)}
                      className={`chip mb-2 ${everywhere ? 'border-brand-700 bg-brand-50 text-brand-700' : 'chip-off'}`}>
                      {everywhere ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      Anywhere in {county}
                    </button>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {list.map((a) => {
                      const on = selected.has(a.name.toLowerCase());
                      return (
                        <button key={a.name} type="button" onClick={() => toggle(a.name)} className={`chip ${on ? 'chip-on' : 'chip-off'}`}>
                          {on && <Check className="h-3.5 w-3.5" />}{a.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {custom.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Other areas you added</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {custom.map((name) => (
              <button key={name} type="button" onClick={() => toggle(name)} className="chip chip-on" aria-label={`Remove ${name}`}>
                {name}<X className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** First chosen area with known coordinates: the home base used for distance. */
export function baseOf(areas) {
  return areas.map(known).find(Boolean) || null;
}
