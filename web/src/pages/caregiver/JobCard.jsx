import { CalendarDays, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { DAYS, SCHEDULE_TYPES } from '../../lib/constants';
import { fmtDate, kes, recipientLabel, timeAgo } from '../../lib/format';
import { Button, Card } from '../../components/ui';

export default function JobCard({ request: r, distance, applied, onApply }) {
  const schedule = SCHEDULE_TYPES.find((s) => s.value === r.schedule_type)?.label;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">{recipientLabel(r.care_recipient)}</h3>
          <p className="text-sm text-brand-700">{(r.care_types || []).join(', ')}</p>
        </div>
        {Number(r.budget_max) > 0 ? (
          <div className="text-right">
            <div className="font-extrabold">{kes(r.budget_min)}–{Number(r.budget_max).toLocaleString('en-KE')}</div>
            <div className="text-xs text-gray-500">per hour</div>
          </div>
        ) : <span className="text-xs font-semibold text-gray-500">Flexible budget</span>}
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-gray-600">
        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" />
          {r.location_name || 'Location on request'}{distance !== null && distance !== undefined && <span className="font-semibold text-gray-900">· {distance.toFixed(1)} km away</span>}
        </div>
        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gray-400" />
          {schedule} from {fmtDate(r.start_date)}{r.end_date && ` to ${fmtDate(r.end_date)}`}
        </div>
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-400" />
          {r.hours_per_day} hrs/day{r.days_of_week?.length > 0 && ` · ${r.days_of_week.map((d) => DAYS[d]).join(', ')}`}
        </div>
      </div>
      {r.special_needs && <p className="mt-3 line-clamp-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">{r.special_needs}</p>}
      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="text-xs text-gray-400">Posted {timeAgo(r.created_at)} by {r.patient?.full_name?.split(' ')[0]}</span>
        {applied ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Applied</span>
        ) : (
          <Button size="sm" onClick={() => onApply(r)}>Apply</Button>
        )}
      </div>
    </Card>
  );
}
