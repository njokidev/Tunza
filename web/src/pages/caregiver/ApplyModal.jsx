import { useState } from 'react';
import { careRequestApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { recipientLabel } from '../../lib/format';
import { Alert, Button, Field, Modal } from '../../components/ui';

export default function ApplyModal({ request, defaultRate, onClose, onApplied }) {
  const [message, setMessage] = useState('');
  const [rate, setRate] = useState(defaultRate ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!request) return null;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await careRequestApi.apply(request.id, { message: message.trim(), proposed_rate: rate || null });
      onApplied(request.id);
    } catch (e) {
      const msg = errorMessage(e);
      if (/already applied/i.test(msg)) onApplied(request.id);
      else { setError(msg); setSaving(false); }
    }
  };

  return (
    <Modal open onClose={onClose} title={`Apply: ${recipientLabel(request.care_recipient)}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Send application</Button></>}>
      <div className="space-y-4">
        <Field label="Your message to the family" hint="Mention relevant experience, your availability and how far you are.">
          <textarea className="input min-h-[120px]" value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Habari! I have 4 years caring for elderly clients with dementia and live 10 minutes away…" />
        </Field>
        <Field label="Your proposed rate (KES / hour)">
          <input type="number" min={0} className="input" value={rate} onChange={(e) => setRate(e.target.value)} />
        </Field>
        <Alert>{error}</Alert>
      </div>
    </Modal>
  );
}
