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
  Input,
  LoadingLogo,
} from '../components/common/FirstButton/ui';

const SELECTED_DEVICE_KEY = 'besafe.selectedDeviceId';

function readSelectedDeviceId() {
  try {
    return localStorage.getItem(SELECTED_DEVICE_KEY) || '';
  } catch {
    return '';
  }
}

function writeSelectedDeviceId(id) {
  try {
    if (!id) localStorage.removeItem(SELECTED_DEVICE_KEY);
    else localStorage.setItem(SELECTED_DEVICE_KEY, id);
  } catch {
    // ignore
  }
}

function normalizeHistoryPayload(payload) {
  // Accepts: array, {history:[]}, {signals:[]}, or unknown.
  const arr =
    Array.isArray(payload) ? payload :
    Array.isArray(payload?.history) ? payload.history :
    Array.isArray(payload?.signals) ? payload.signals :
    Array.isArray(payload?.items) ? payload.items :
    [];

  return arr
    .map((x) => ({
      platform: x?.platform || 'unknown',
      kind: x?.kind || (x?.creator ? 'creators' : 'topics'),
      label: x?.label || x?.topic || x?.subreddit || x?.hashtag || x?.category || 'unknown',
      creator: x?.creator || x?.channel || x?.streamer || '',
      url: x?.url || '',
      occurrenceCount: Number.isFinite(x?.occurrenceCount) ? x.occurrenceCount : 1,
      createdAt: x?.createdAt || x?.timestamp || null,
    }))
    .filter((x) => x.label && x.label !== 'unknown');
}

function sumBy(arr, keyFn, valueFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    const v = valueFn(item);
    m.set(k, (m.get(k) || 0) + v);
  }
  return Array.from(m.entries()).map(([k, v]) => ({ key: k, value: v }));
}

export default function DailySummaryPage() {
  const { devices, isLoading: devicesLoading, error: devicesError, reload: reloadDevices } = useDevices();

  const [deviceId, setDeviceId] = useState(() => readSelectedDeviceId());

  const [platformFilter, setPlatformFilter] = useState('all');
  const [minCount, setMinCount] = useState(1);

  const [history, setHistory] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const [ageGroup] = useState('12-14');
  const [location] = useState('Israel');

  useEffect(() => {
    if (deviceId) writeSelectedDeviceId(deviceId);
  }, [deviceId]);

  const deviceOptions = useMemo(() => {
    const list = Array.isArray(devices) ? devices : [];
    return list.map((d) => ({
      id: d?._id || d?.id || '',
      name: d?.name || 'Unnamed device',
    })).filter((x) => x.id);
  }, [devices]);

  // Auto-select first device if none selected
  useEffect(() => {
    if (devicesLoading) return;
    if (deviceId) return;
    const first = deviceOptions[0]?.id;
    if (first) setDeviceId(first);
  }, [devicesLoading, deviceOptions, deviceId]);

  async function loadDaily() {
    if (!deviceId) return;
    setReportError('');
    setReportLoading(true);
    setAiResult(null);
    setAiError('');
    try {
      const res = await api.signals.today({ deviceId });
      const normalized = normalizeHistoryPayload(res);
      setHistory(normalized);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load daily report';
      setReportError(msg);
      setHistory([]);
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    loadDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const filtered = useMemo(() => {
    return history.filter((x) => {
      if (platformFilter !== 'all' && x.platform !== platformFilter) return false;
      if (x.occurrenceCount < Number(minCount || 1)) return false;
      return true;
    });
  }, [history, platformFilter, minCount]);

  const platforms = useMemo(() => {
    const rows = sumBy(filtered, (x) => x.platform, (x) => x.occurrenceCount)
      .sort((a, b) => b.value - a.value);
    const total = rows.reduce((acc, r) => acc + r.value, 0);
    return { rows, total };
  }, [filtered]);

  const topTopics = useMemo(() => {
    // Treat anything not explicitly creator-kind as topic-like.
    const topics = filtered.filter((x) => x.kind !== 'creators');
    return sumBy(topics, (x) => x.label, (x) => x.occurrenceCount)
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [filtered]);

  const topCreators = useMemo(() => {
    // Get explicit creators
    const explicitCreators = filtered.filter((x) => x.kind === 'creators');
    
    // Also get YouTube channels that might be labeled as topics but are actually creators
    const youtubeChannels = filtered.filter((x) => 
      x.platform === 'youtube' && 
      x.kind !== 'creators' && 
      // Common patterns for YouTube channel names
      (x.label.includes('Channel') || x.label.includes('TV') || x.label.includes('Official') || 
       x.label.match(/^[A-Z][a-zA-Z0-9\s]+$/) || // Capitalized names
       x.label.length > 3) // Avoid short topic-like labels
    );
    
    const allCreators = [...explicitCreators, ...youtubeChannels];
    
    return sumBy(allCreators, (x) => x.label, (x) => x.occurrenceCount)
      .filter((x) => x.key && x.key !== 'unknown')
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [filtered]);

  const platformChoices = useMemo(() => {
    const uniq = Array.from(new Set(history.map((x) => x.platform))).filter(Boolean).sort();
    return ['all', ...uniq];
  }, [history]);

  async function runAi() {
    setAiError('');
    setAiLoading(true);
    setAiResult(null);
    try {
      const dailyPrompt = [
        "you write concise, detailed, parent-friendly hebrew summaries about a child's online activity from today/the past 24 hours, detailing relevant topics, creators, and platforms they engaged with.",
        "return ONLY valid JSON (no markdown, no extra text).",
        "do not invent topics/creators/platforms not present in the facts.",
        "avoid full URLs; use domains only if needed.",
        "IMPORTANT: Keep all topic names and creator names in their original language. If you need to explain what they mean, put the Hebrew translation in parentheses after the original name.",
        "Example: 'Minecraft (משחק בנייה)' or 'PewDiePie (יוטיובר משחקים)'.",
        "DO NOT use the word parents, say YOU in plural in the explanation.",
        "ALWAYS: provide conversation starters for parents to discuss online safety with their child.",
        "be sensitive and avoid alarming language; focus on understanding and guidance.",
        "make the summary medium-length, not too short or too long.",
        "if one of the facts is a probleamatic content item or trend, POINT IT OUT (tell the parent which one it is clearly) and explain what it is and why it's concerning for parents.",
        "Focus on today's activity and what happened in the past 24 hours."
      ].join(" ");
      
      const res = await api.ai.summary({
        history: filtered,
        ageGroup,
        location,
        prompt: dailyPrompt
      });
      setAiResult(res);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'AI summary failed';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  }

  const hasDevice = Boolean(deviceId);
  const hasData = filtered.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="סיכום יומי"
        subtitle="סקירת פעילות היום."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadDaily} disabled={!hasDevice || reportLoading}>
              {reportLoading ? 'מרענן...' : 'רענון'}
            </Button>
          </div>
        }
      />

      {devicesError ? <ErrorBanner message={devicesError} onRetry={reloadDevices} /> : null}

      <Card>
        <CardHeader title="מסננים" />
        <CardBody>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Select label="מכשיר" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              {deviceOptions.length === 0 ? <option value="">אין מכשירים</option> : null}
              {deviceOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>

            <Select label="פלטפורמה" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
              {platformChoices.map((p) => (
                <option key={p} value={p}>{p === 'all' ? 'כל הפלטפורמות' : p}</option>
              ))}
            </Select>

            <Input
              label="מספר מינימלי"
              type="number"
              min={1}
              value={minCount}
              onChange={(e) => setMinCount(Number(e.target.value || 1))}
              hint="מסנן פריטים עם סיגנל נמוך."
            />

            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={runAi}
                disabled={!hasDevice || !hasData || aiLoading}
              >
                {aiLoading ? 'מייצר סיכום AI...' : 'יצירת סיכום AI'}
              </Button>
            </div>
          </div>

          {reportError ? <div className="mt-4"><ErrorBanner message={reportError} onRetry={loadDaily} /></div> : null}
          {aiError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {aiError}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {aiLoading && (
        <Card>
          <CardBody>
            <LoadingLogo message="מייצר סיכום AI..." />
          </CardBody>
        </Card>
      )}

      {aiResult?.shortSummaryHe && !aiLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="סיכום AI" />
            <CardBody>
              <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50 p-4">
                <div className="text-sm text-slate-700">{aiResult.shortSummaryHe}</div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardHeader title="ניתוח AI" />
            <CardBody>
              {aiResult?.topTopicsHe?.length ? (
                <div className="space-y-2">
                  {aiResult.topTopicsHe.slice(0, 3).map((x, idx) => (
                    <div key={idx} className="rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 p-3">
                      <div className="text-sm font-medium text-slate-800">{x.topic}</div>
                      <div className="mt-1 text-sm text-slate-700">{x.meaningHe}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-600">אין ניתוח זמין</div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {reportLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : !hasDevice ? (
        <EmptyState title="לא נבחר מכשיר" subtitle="עברו למכשירים ובחרו אחד." />
      ) : !hasData ? (
        <EmptyState
          title="אין נתוני פעילות להיום"
          subtitle="אם התוסף מצומד, המתינו להעלאות ורעננו."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader
              title="שימוש לפי פלטפורמה"
              right={<InlinePill>{platforms.total} סה״כ</InlinePill>}
            />
            <CardBody>
              <div className="flex flex-col gap-2">
                {platforms.rows.map((r) => {
                  const pct = platforms.total ? Math.round((r.value / platforms.total) * 100) : 0;
                  return (
                    <div key={r.key} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-900">{r.key}</div>
                        <div className="text-sm text-slate-600">{r.value} ({pct}%)</div>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-slate-900"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="נושאים מובילים" />
            <CardBody>
              <div className="flex flex-col gap-2">
                {topTopics.map((t) => (
                  <div key={t.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="truncate text-sm font-medium text-slate-900">{t.key}</div>
                    <InlinePill>{t.value}</InlinePill>
                  </div>
                ))}
              </div>

              {aiResult?.topTopicsHe?.length ? (
                <div className="mt-4 rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50 p-4">
                  <div className="text-sm font-semibold text-slate-800">ניתוח AI</div>
                  <div className="mt-2 space-y-2">
                    {aiResult.topTopicsHe.slice(0, 6).map((x, idx) => (
                      <div key={idx} className="rounded-xl bg-white/80 backdrop-blur-sm p-3">
                        <div className="text-sm font-medium text-slate-800">{x.topic}</div>
                        <div className="mt-1 text-sm text-slate-700">{x.meaningHe}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader title="יוצרים מובילים" />
            <CardBody>
              {topCreators.length === 0 ? (
                <div className="text-sm text-slate-600">אין יוצרים בפעילות היום</div>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {topCreators.map((c) => (
                    <div key={c.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="truncate text-sm font-medium text-slate-900">{c.key}</div>
                      <InlinePill>{c.value}</InlinePill>
                    </div>
                  ))}
                </div>
              )}

              {aiResult?.topCreatorsHe?.length ? (
                <div className="mt-4 rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50 p-4">
                  <div className="text-sm font-semibold text-slate-800">ניתוח יוצרים</div>
                  <div className="mt-2 space-y-2">
                    {aiResult.topCreatorsHe.slice(0, 6).map((x, idx) => (
                      <div key={idx} className="rounded-xl bg-white/80 backdrop-blur-sm p-3">
                        <div className="text-sm font-medium text-slate-800">{x.name}</div>
                        <div className="mt-1 text-sm text-slate-700">{x.whyHe}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
