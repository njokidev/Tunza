import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { messageApi, unwrap } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { fmtTime, isSameDay, fmtDay, timeAgo } from '../../lib/format';
import { Alert, Avatar, Card, EmptyState, Spinner } from '../../components/ui';

const CONV_POLL_MS = 10000;
const THREAD_POLL_MS = 4000;

function usePolling(fn, ms, deps) {
  useEffect(() => {
    let alive = true;
    const tick = () => alive && document.visibilityState === 'visible' && fn();
    fn();
    const t = setInterval(tick, ms);
    return () => { alive = false; clearInterval(t); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function Messages() {
  const { convId } = useParams();
  const { user } = useAuth();
  const [convs, setConvs] = useState(null);
  const [error, setError] = useState('');

  usePolling(async () => {
    try {
      const list = unwrap((await messageApi.conversations()).data);
      const ts = (c) => new Date(c.last_message?.created_at ?? c.created_at).getTime();
      setConvs(list.sort((a, b) => ts(b) - ts(a)));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, CONV_POLL_MS, []);

  const other = (c) => c.participants.find((p) => p.id !== user.id) ?? c.participants[0];
  const active = convs?.find((c) => c.id === convId);

  return (
    <div>
      <h1 className={`mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl ${convId ? 'hidden md:block' : ''}`}>Messages</h1>
      <Alert>{error}</Alert>
      <Card className="grid h-[calc(100vh-15rem)] min-h-[420px] overflow-hidden md:grid-cols-[320px_1fr]">
        <aside className={`overflow-y-auto border-r border-gray-100 ${convId ? 'hidden md:block' : ''}`}>
          {convs === null && <div className="flex justify-center p-10"><Spinner /></div>}
          {convs?.length === 0 && (
            <div className="p-6 text-sm text-gray-500">
              No conversations yet. Start one from a {user.role === 'patient' ? 'caregiver profile' : 'booking'}.
            </div>
          )}
          {convs?.map((c) => {
            const o = other(c);
            return (
              <Link key={c.id} to={`/messages/${c.id}`}
                className={`flex items-center gap-3 border-b border-gray-50 px-4 py-3.5 transition ${c.id === convId ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>
                <Avatar name={o?.full_name} src={o?.avatar} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{o?.full_name}</span>
                    {c.last_message && <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(c.last_message.created_at)}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-xs ${c.unread_count ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      {c.last_message ? `${c.last_message.sender.id === user.id ? 'You: ' : ''}${c.last_message.body}` : 'Say hello 👋'}
                    </span>
                    {c.unread_count > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-700 px-1.5 text-[11px] font-bold text-white">{c.unread_count}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </aside>

        <section className={`flex min-h-0 flex-col ${convId ? '' : 'hidden md:flex'}`}>
          {convId ? (
            <Thread key={convId} convId={convId} other={active ? other(active) : null} me={user}
              onSent={(msg) => setConvs((list) => list?.map((c) => (c.id === convId ? { ...c, last_message: msg } : c)))} />
          ) : (
            <div className="m-auto p-6">
              <EmptyState icon={MessageCircle} title="Pick a conversation">
                Messages between families and caregivers stay on Tunza.
              </EmptyState>
            </div>
          )}
        </section>
      </Card>
    </div>
  );
}

function Thread({ convId, other, me, onSent }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const lastCount = useRef(0);

  usePolling(async () => {
    try {
      const list = await messageApi.recent(convId);
      setMessages(list);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, THREAD_POLL_MS, [convId]);

  useEffect(() => {
    if (messages && messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError('');
    try {
      const { data } = await messageApi.send(convId, body);
      const msg = data.sender ? data : { ...data, sender: me, created_at: data.created_at ?? new Date().toISOString() };
      setMessages((m) => [...(m ?? []), msg]);
      onSent(msg);
      setDraft('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <button onClick={() => navigate('/messages')} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 md:hidden" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={other?.full_name} src={other?.avatar} size="sm" />
        <div>
          <div className="text-sm font-bold">{other?.full_name ?? 'Conversation'}</div>
          {other && <div className="text-xs capitalize text-gray-500">{other.role}</div>}
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-[#FBFAFD] px-4 py-5">
        {messages === null && <div className="flex justify-center p-10"><Spinner /></div>}
        {messages?.length === 0 && <p className="py-10 text-center text-sm text-gray-400">No messages yet. Introduce yourself and share what care you need.</p>}
        {messages?.map((m, i) => {
          const mine = m.sender?.id === me.id;
          const showDay = i === 0 || !isSameDay(messages[i - 1].created_at, m.created_at);
          return (
            <div key={m.id}>
              {showDay && <div className="my-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">{fmtDay(m.created_at)}</div>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${mine ? 'rounded-br-md bg-brand-700 text-white' : 'rounded-bl-md bg-white text-gray-800'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-right text-[10px] ${mine ? 'text-brand-200' : 'text-gray-400'}`}>{fmtTime(m.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <div className="px-4 pt-2"><Alert>{error}</Alert></div>}
      <form onSubmit={send} className="flex gap-2 border-t border-gray-100 p-3">
        <input className="input" placeholder="Type a message…" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} />
        <button type="submit" disabled={sending || !draft.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white transition hover:bg-brand-800 disabled:opacity-50" aria-label="Send">
          {sending ? <Spinner className="h-4 w-4 text-white" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </>
  );
}
