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
  Input,
  PageTitle,
  Select,
} from '../components/common/FirstButton/ui';

const SELECTED_DEVICE_KEY = 'besafe.selectedDeviceId';

function readSelectedDeviceId() {
  try {
    return localStorage.getItem(SELECTED_DEVICE_KEY) || '';
  } catch {
    return '';
  }
}

export default function PrivacyPage() {
  const { devices, isLoading: devicesLoading, error: devicesError, reload: reloadDevices } = useDevices();
  const [deviceId, setDeviceId] = useState(() => readSelectedDeviceId());

  const [startDate, setStartDate] = useState(''); // yyyy-mm-dd
  const [endDate, setEndDate] = useState('');     // yyyy-mm-dd

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteResult, setDeleteResult] = useState(null);

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

  async function onDeleteRange() {
    if (!deviceId) return;
    setDeleteError('');
    setDeleteResult(null);

    const rangeText =
      startDate || endDate
        ? `from ${startDate || '(any)'} to ${endDate || '(any)'}`
        : 'ALL data for this device';

    const ok = window.confirm(`Delete ${rangeText}? This action cannot be undone.`);
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await api.signals.deleteRange({
        deviceId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setDeleteResult(res);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Delete failed';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="פרטיות ונתונים"
        subtitle="בקרת נתונים ושקיפות."
        right={<Button variant="secondary" onClick={reloadDevices}>רענון</Button>}
      />

      {devicesError ? <ErrorBanner message={devicesError} onRetry={reloadDevices} /> : null}

      <Card>
        <CardHeader title="מה אנחנו אוספים" />
        <CardBody>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>פלטפורמה/מקור (למשל, YouTube, Twitch, Reddit).</li>
            <li>תוויות נושא (למשל, קטגוריות, האשטאגים).</li>
            <li>שמות יוצרים/ערוצים כשהם נראים.</li>
            <li>ספירות פעילות וזמן שהושקע.</li>
          </ul>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">מה אנחנו לא אוספים</div>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>היסטוריית גלישה מלאה או תוכן פרטי.</li>
              <li>הודעות, צ׳אטים, סיסמאות, או מידע אישי.</li>
              <li>הקלטות מסך או לחיצות מקלדת.</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="מחיקת נתונים" />
        <CardBody>
          {deviceOptions.length === 0 ? (
            <EmptyState title="אין מכשירים" subtitle="צרו/בחרו מכשיר לפני מחיקת נתונים." />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
              <Select label="מכשיר" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                {deviceOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>

              <Input
                label="תאריך התחלה (אופציונלי)"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Input
                label="תאריך סיום (אופציונלי)"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              <Button variant="danger" onClick={onDeleteRange} disabled={!deviceId || deleting}>
                {deleting ? 'מוחק...' : 'מחיקה'}
              </Button>
            </div>
          )}

          {deleteError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {deleteError}
            </div>
          ) : null}

          {deleteResult ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">תוצאת מחיקה</div>
              <pre className="mt-2 overflow-auto rounded-xl bg-white p-3 text-xs text-slate-800">
                {JSON.stringify(deleteResult, null, 2)}
              </pre>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
