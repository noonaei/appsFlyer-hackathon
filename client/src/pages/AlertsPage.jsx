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
    url: x?.url || '',
    occurrenceCount: Number.isFinite(x?.occurrenceCount) ? x.occurrenceCount : 1,
  })).filter((x) => x.label && x.label !== 'unknown');
}

function severityTone(sev) {
  const s = String(sev || '').toLowerCase();
  if (s.includes('critical')) return 'critical';
  if (s.includes('high')) return 'high';
  if (s.includes('medium') || s.includes('moderate')) return 'medium';
  if (s.includes('low') || s.includes('info')) return 'low';
  return 'neutral';
}

export default function AlertsPage() {
  const { devices, isLoading: devicesLoading, error: devicesError, reload: reloadDevices } = useDevices();

  const [deviceId, setDeviceId] = useState(() => readSelectedDeviceId());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const [expanded, setExpanded] = useState(null);

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

  async function loadAlerts() {
    if (!deviceId) return;
    setError('');
    setAiError('');
    setAiResult(null);
    setExpanded(null);

    setLoading(true);
    try {
      const daily = await api.signals.today({ deviceId });
      const history = normalizeHistoryPayload(daily);

      setAiLoading(true);
      try {
        // Get normal summary
        const res = await api.ai.summary({ history, ageGroup: '12-14', location: 'Israel' });
        setAiResult(res);
      } catch (err) {
        const msg = err?.response?.data?.error || err?.message || 'AI summary failed';
        setAiError(msg);
      } finally {
        setAiLoading(false);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load daily data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const alerts = useMemo(() => {
    const arr = aiResult?.alerts;
    return Array.isArray(arr) ? arr : [];
  }, [aiResult]);

  const hasDevice = Boolean(deviceId);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="התראות"
        subtitle="התראות חשובות על פעילות הילד שלכם."
        right={
          <Button variant="secondary" onClick={loadAlerts} disabled={!hasDevice || loading || aiLoading}>
            {loading || aiLoading ? 'מרענן...' : 'רענון'}
          </Button>
        }
      />

      {devicesError ? <ErrorBanner message={devicesError} onRetry={reloadDevices} /> : null}
      {error ? <ErrorBanner message={error} onRetry={loadAlerts} /> : null}

      <Card>
        <CardHeader title="מכשיר" />
        <CardBody>
          <div className="max-w-md">
            <Select label="מכשיר" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              {deviceOptions.length === 0 ? <option value="">אין מכשירים</option> : null}
              {deviceOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>

          {aiError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {aiError}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : !hasDevice ? (
        <EmptyState title="לא נבחר מכשיר" subtitle="בחרו מכשיר כדי לראות התראות." />
      ) : alerts.length === 0 ? (
        <EmptyState title="אין התראות" subtitle="אין נושאים/יוצרים מסומנים ליום הנוכחי." />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {alerts.map((a, idx) => {
            const id = a?.id || `${idx}`;
            const isOpen = expanded === id;

            return (
              <Card key={id}>
                <CardHeader
                  title={a?.item || a?.label || 'Alert'}
                  subtitle={a?.explanation || a?.explanationHe || a?.shortExplanation || ''}
                  right={<InlinePill tone={severityTone(a?.severity)}>{a?.severity || 'unknown'}</InlinePill>}
                />
                <CardBody>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => setExpanded(isOpen ? null : id)}>
                        {isOpen ? 'הסתר פרטים' : 'הצג פרטים'}
                      </Button>
                    </div>

                    {isOpen ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 mb-2">פריט מסוכן</div>
                            <div className="text-sm text-slate-700">{a?.item || 'לא זוהה'}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-semibold text-slate-900 mb-2">הסבר</div>
                            <div className="text-sm text-slate-700">{a?.explanation || a?.explanationHe || 'אין הסבר זמין'}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-semibold text-slate-900 mb-2">פעולה מומלצת</div>
                            <div className="text-sm text-slate-700">{a?.suggestedAction || a?.suggestedActionHe || a?.action || 'אין המלצה זמינה'}</div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
