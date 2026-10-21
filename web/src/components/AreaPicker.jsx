import { useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { AREAS } from '../lib/constants';

/**
 * Pick a known area (gives lat/lng for distance matching) or use the browser's location.
 * value: { location_name, latitude, longitude }
 */
export default function AreaPicker({ value, onChange }) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const known = AREAS.some((a) => a.name === value.location_name);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setGeoError('Location is not available in this browser.'); return; }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        // Name it after the nearest known area so it reads well on cards.
        const nearest = AREAS.reduce((best, a) => {
          const d = (a.lat - coords.latitude) ** 2 + (a.lng - coords.longitude) ** 2;
          return d < best.d ? { a, d } : best;
        }, { a: null, d: Infinity }).a;
        onChange({
          location_name: nearest ? `Near ${nearest.name}` : 'My location',
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
        });
        setLocating(false);
      },
      () => { setGeoError('Could not get your location. Pick an area instead.'); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  return (
    <div>
      <div className="flex gap-2">
        <select
          className="input"
          value={known ? value.location_name : ''}
          onChange={(e) => {
            const a = AREAS.find((x) => x.name === e.target.value);
            if (a) onChange({ location_name: a.name, latitude: a.lat, longitude: a.lng });
          }}
        >
          <option value="" disabled>{value.location_name && !known ? value.location_name : 'Select area…'}</option>
          {AREAS.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
        </select>
        <button
          type="button"
          onClick={useMyLocation}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">{locating ? 'Locating…' : 'Use my location'}</span>
        </button>
      </div>
      {geoError && <p className="mt-1 text-xs text-red-600">{geoError}</p>}
    </div>
  );
}
