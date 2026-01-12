import { useMemo, useState } from 'react';
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
  InlinePill,
  PageTitle,
  Skeleton,
} from '../components/common/FirstButton/ui';

const SELECTED_DEVICE_KEY = 'besafe.selectedDeviceId';

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function copyToClipboard(text) {
  if (!text) return;
  if (navigator?.clipboard?.writeText) return navigator.clipboard.writeText(text);
  // fallback
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

export default function DevicesPage() {
  const { devices, isLoading, error, reload } = useDevices();

  const [createName, setCreateName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdToken, setCreatedToken] = useState('');
  const [createdDeviceId, setCreatedDeviceId] = useState('');

  const [isDeletingId, setIsDeletingId] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const selectedDeviceId = useMemo(() => {
    try {
      return localStorage.getItem(SELECTED_DEVICE_KEY) || '';
    } catch {
      return '';
    }
  }, []);

  function setSelectedDeviceId(id) {
    try {
      if (!id) localStorage.removeItem(SELECTED_DEVICE_KEY);
      else localStorage.setItem(SELECTED_DEVICE_KEY, id);
    } catch {
      // ignore
    }
  }

  async function onCreateDevice(e) {
    e.preventDefault();
    setCreateError('');
    setCreatedToken('');
    setCreatedDeviceId('');

    const name = createName.trim();
    if (!name) {
      setCreateError('Device name is required.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await api.devices.create({ name });
      // backend returns: { deviceToken, deviceId }
      setCreatedToken(res?.deviceToken || '');
      setCreatedDeviceId(res?.deviceId || '');
      setCreateName('');
      await reload();

      // auto-select newly created device when possible
      const toSelect = res?.deviceId || '';
      if (toSelect) setSelectedDeviceId(toSelect);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to create device';
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  }

  async function onDeleteDevice(deviceId) {
    setDeleteError('');
    const ok = window.confirm('Delete this device? This removes the device from your dashboard.');
    if (!ok) return;

    setIsDeletingId(deviceId);
    try {
      await api.devices.remove({ deviceId });
      if (selectedDeviceId === deviceId) setSelectedDeviceId('');
      await reload();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to delete device';
      setDeleteError(msg);
    } finally {
      setIsDeletingId('');
    }
  }

  const hasDevices = Array.isArray(devices) && devices.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="מכשירים"
        subtitle="צרו מכשיר כדי ליצור קוד צימוד לתוסף הכרום."
        right={<Button variant="secondary" onClick={reload}>רענון</Button>}
      />

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      <Card>
        <CardHeader title="הוספת מכשיר" subtitle="זה יוצר אסימון מכשיר לצימוד." />
        <CardBody>
          <form onSubmit={onCreateDevice} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              label="שם המכשיר"
              placeholder="למשל, מחשב ילד"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              disabled={isCreating}
            />
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'יוצר...' : 'יצירת מכשיר'}
            </Button>
          </form>

          {createError ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {createError}
            </div>
          ) : null}

          {createdToken ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">אסימון צימוד</div>
                  <div className="mt-1 text-sm text-slate-600">
                    בעמוד האפשרויות של התוסף, הדביקו את האסימון הזה כדי לצמד את המכשיר.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => copyToClipboard(createdToken)}
                >
                  העתק
                </Button>
              </div>

              <div className="mt-3 rounded-xl bg-white px-3 py-2 font-mono text-sm text-slate-900">
                {createdToken}
              </div>

              {createdDeviceId ? (
                <div className="mt-2 text-xs text-slate-500">
                  מזהה מכשיר: <span className="font-mono">{createdDeviceId}</span>
                </div>
              ) : null}

              <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                <li>פתחו כרום → תוספים → ניהול תוספים.</li>
                <li>פתחו את התוסף שלכם → אפשרויות.</li>
                <li>הדביקו את האסימון ואשרו את הצימוד.</li>
                <li>לאחר העלאות, המכשיר הזה יראה פעילות בעמודי היומי/שבועי.</li>
              </ol>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="המכשירים שלכם"
          subtitle="בחרו מכשיר לשימוש בעמודי הדוחות."
        />
        <CardBody>
          {deleteError ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {deleteError}
            </div>
          ) : null}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : !hasDevices ? (
            <EmptyState
              title="עדיין אין מכשירים"
              subtitle="צרו מכשיר למעלה כדי ליצור אסימון צימוד."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {devices.map((d) => {
                const deviceId = d?._id || d?.id || '';
                const isSelected = deviceId && selectedDeviceId === deviceId;

                return (
                  <div
                    key={deviceId || d?.deviceToken}
                    className={`rounded-2xl border px-4 py-3 ${
                      isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {d?.name || 'מכשיר ללא שם'}
                          </div>
                          {isSelected ? <InlinePill>נבחר</InlinePill> : null}
                        </div>

                        <div className="mt-1 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2">
                          <div>
                            נוצר: <span className="text-slate-700">{formatDateTime(d?.createdAt)}</span>
                          </div>
                          <div className="truncate">
                            אסימון: <span className="font-mono text-slate-700">{d?.deviceToken || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                          variant={isSelected ? 'secondary' : 'primary'}
                          onClick={() => setSelectedDeviceId(deviceId)}
                          disabled={!deviceId}
                        >
                          {isSelected ? 'נבחר' : 'בחירה'}
                        </Button>

                        <Button
                          variant="secondary"
                          onClick={() => copyToClipboard(d?.deviceToken || '')}
                          disabled={!d?.deviceToken}
                        >
                          העתק אסימון
                        </Button>

                        <Button
                          variant="danger"
                          onClick={() => onDeleteDevice(deviceId)}
                          disabled={!deviceId || isDeletingId === deviceId}
                        >
                          {isDeletingId === deviceId ? 'מוחק...' : 'מחיקה'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
