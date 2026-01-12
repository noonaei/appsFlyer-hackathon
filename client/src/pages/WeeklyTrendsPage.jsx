import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useDevices } from '../hooks/useDevices';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorBanner,
  InlinePill,
  PageTitle,
  Select,
  Skeleton,
} from '../components/common/FirstButton/ui';

const SELECTED_DEVICE_KEY = 'besafe.selectedDeviceId';

function readSelectedDeviceId() {
  try {
    return localStorage.getItem(SELECTED_DEVICE_KEY) || '';
  } catch {
    return '';
  }
}

function normalizeHistoryPayload(payload) {
  const arr =
    Array.isArray(payload) ? payload :
    Array.isArray(payload?.history) ? payload.history :
    Array.isArray(payload?.signals) ? payload.signals :
    Array.isArray(payload?.items) ? payload.items :
    [];

  return arr.map((x) => ({
    platform: x?.platform || 'unknown',
    kind: x?.kind || (x?.creator ? 'creators' : 'topics'),
    label: x?.label || x?.topic || x?.subreddit || x?.hashtag || x?.category || 'unknown',
    creator: x?.creator || x?.channel || x?.streamer || '',
    occurrenceCount: Number.isFinite(x?.occurrenceCount) ? x.occurrenceCount : 1,
  })).filter((x) => x.label && x.label !== 'unknown');
}

function sumCountsByLabel(items) {
  const m = new Map();
  for (const x of items) {
    const key = x.label;
    m.set(key, (m.get(key) || 0) + x.occurrenceCount);
  }
  return m;
}

export default function WeeklyTrendsPage() {
  const { devices, isLoading: devicesLoading, error: devicesError, reload: reloadDevices } = useDevices();
  const [deviceId, setDeviceId] = useState(() => readSelectedDeviceId());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const [todayItems, setTodayItems] = useState([]);
  const [weekItems, setWeekItems] = useState([]);

  const deviceOptions = useMemo(() => {
    const list = Array.isArray(devices) ? devices : [];
    return list.map((d) => ({
      id: d?._id || d?.id || '',
      name: d?.name || 'Unnamed device',
    })).filter((x) => x.id);
  }, [devices]);

  useEffect(() => {
    if (devicesLoading) return;
    if (deviceId) return;
    const first = deviceOptions[0]?.id;
    if (first) setDeviceId(first);
  }, [devicesLoading, deviceOptions, deviceId]);

  async function loadWeekly() {
    if (!deviceId) return;
    setError('');
    setAiError('');
    setAiResult(null);
    setLoading(true);
    try {
      const [today, last5] = await Promise.all([
        api.signals.today({ deviceId }),
        api.signals.last5days({ deviceId }),
      ]);

      const t = normalizeHistoryPayload(today);
      const w = normalizeHistoryPayload(last5);

      setTodayItems(t);
      setWeekItems(w);

      // Generate AI weekly trends summary
      if (w.length > 0) {
        setAiLoading(true);
        try {
          const res = await api.ai.summary({ 
            history: w, 
            ageGroup: '12-14', 
            location: 'Israel',
            prompt: 'Analyze weekly trends and patterns in this data. Focus on what topics are trending up, down, or newly emerging. Provide insights about behavioral changes over the week.' 
          });
          setAiResult(res);
        } catch (err) {
          const msg = err?.response?.data?.error || err?.message || 'AI summary failed';
          setAiError(msg);
        } finally {
          setAiLoading(false);
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load weekly trends';
      setError(msg);
      setTodayItems([]);
      setWeekItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWeekly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const trends = useMemo(() => {
    // Approximation due to current backend: "weekly" = last 5 days
    const todayMap = sumCountsByLabel(todayItems);
    const weekMap = sumCountsByLabel(weekItems);

    const allLabels = new Set([...todayMap.keys(), ...weekMap.keys()]);
    const rows = [];

    for (const label of allLabels) {
      const todayCount = todayMap.get(label) || 0;
      const weekTotal = weekMap.get(label) || 0;
      const weekAvg = weekTotal / 5;

      let score = 0;
      let type = 'flat';

      if (weekTotal === 0 && todayCount > 0) {
        type = 'new';
        score = 9999;
      } else if (weekAvg > 0) {
        const ratio = todayCount / weekAvg;
        score = ratio; // >1 trending up, <1 trending down
        if (ratio >= 1.5 && todayCount >= 2) type = 'up';
        else if (ratio <= 0.7 && weekTotal >= 3) type = 'down';
        else type = 'flat';
      }

      rows.push({ label, todayCount, weekTotal, weekAvg, type, score });
    }

    const up = rows.filter((r) => r.type === 'up').sort((a, b) => b.score - a.score).slice(0, 10);
    const down = rows.filter((r) => r.type === 'down').sort((a, b) => a.score - b.score).slice(0, 10);
    const newly = rows.filter((r) => r.type === 'new').sort((a, b) => b.todayCount - a.todayCount).slice(0, 10);

    return { up, down, newly };
  }, [todayItems, weekItems]);

  const hasDevice = Boolean(deviceId);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="מגמות שבועיות"
        subtitle="מגמות פעילות מהשבוע האחרון."
        right={
          <Button variant="secondary" onClick={loadWeekly} disabled={!hasDevice || loading || aiLoading}>
            {loading || aiLoading ? 'מרענן...' : 'רענון'}
          </Button>
        }
      />

      {devicesError ? <ErrorBanner message={devicesError} onRetry={reloadDevices} /> : null}
      {error ? <ErrorBanner message={error} onRetry={loadWeekly} /> : null}
      {aiError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 backdrop-blur-sm px-4 py-3 text-sm text-rose-800">
          AI Summary Error: {aiError}
        </div>
      ) : null}

      <Card>
        <CardHeader title="מכשיר" />
        <CardBody>
          <div className="max-w-md">
            <Select label="Device" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              {deviceOptions.length === 0 ? <option value="">אין מכשירים</option> : null}
              {deviceOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : !hasDevice ? (
        <EmptyState title="לא נבחר מכשיר" subtitle="בחרו מכשיר כדי לראות מגמות." />
      ) : (trends.up.length + trends.down.length + trends.newly.length) === 0 ? (
        <EmptyState title="אין נתוני מגמות" subtitle="המתינו להעלאות פעילות ורעננו." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader title="עולים" />
            <CardBody>
              <div className="flex flex-col gap-2">
                {trends.up.length === 0 ? (
                  <div className="text-sm text-slate-600">No strong increases detected.</div>
                ) : trends.up.map((r) => (
                  <div key={r.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium text-slate-900">{r.label}</div>
                      <InlinePill tone="low">up</InlinePill>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      today: {r.todayCount} • week: {Math.round(r.weekTotal)}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="יורדים" />
            <CardBody>
              <div className="flex flex-col gap-2">
                {trends.down.length === 0 ? (
                  <div className="text-sm text-slate-600">לא זוהו ירידות משמעותיות.</div>
                ) : trends.down.map((r) => (
                  <div key={r.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium text-slate-900">{r.label}</div>
                      <InlinePill tone="neutral">down</InlinePill>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      today: {r.todayCount} • week: {Math.round(r.weekTotal)}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="נושאים חדשים" />
            <CardBody>
              <div className="flex flex-col gap-2">
                {trends.newly.length === 0 ? (
                  <div className="text-sm text-slate-600">לא זוהו נושאים חדשים.</div>
                ) : trends.newly.map((r) => (
                  <div key={r.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium text-slate-900">{r.label}</div>
                      <InlinePill tone="medium">new</InlinePill>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      today: {r.todayCount}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {aiResult?.shortSummaryHe && (
        <Card>
          <CardHeader title="סיכום שבועי" />
          <CardBody>
            <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50 p-4">
              <div className="text-sm text-slate-700">{aiResult.shortSummaryHe}</div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
