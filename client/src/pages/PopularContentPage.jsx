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
  PageTitle,
  Select,
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

export default function PopularContentPage() {
  const { devices, isLoading: devicesLoading, error: devicesError, reload: reloadDevices } = useDevices();

  const [deviceId, setDeviceId] = useState(() => readSelectedDeviceId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [popularContent, setPopularContent] = useState(null);

  const deviceOptions = useMemo(() => {
    const list = Array.isArray(devices) ? devices : [];
    return list.map((d) => ({
      id: d?._id || d?.id || '',
      name: d?.name || 'Unnamed device',
      age: d?.age || null,
    })).filter((x) => x.id);
  }, [devices]);

  const selectedDevice = useMemo(() => {
    return deviceOptions.find(d => d.id === deviceId) || null;
  }, [deviceOptions, deviceId]);

  useEffect(() => {
    if (devicesLoading) return;
    if (deviceId) return;
    const first = deviceOptions[0]?.id;
    if (first) setDeviceId(first);
  }, [devicesLoading, deviceOptions, deviceId]);

  async function loadPopularContent() {
    if (!selectedDevice?.age) return;
    
    setError('');
    setLoading(true);
    
    try {
      const result = await api.ai.popular({ age: selectedDevice.age });
      setPopularContent(result);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load popular content';
      setError(msg);
      setPopularContent(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPopularContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDevice?.age]);

  const hasDevice = Boolean(deviceId);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="מה פופולרי?"
        subtitle="גלו מה פופולרי בקרב בני הגיל של הילד שלכם בישראל."
        right={
          <Button variant="secondary" onClick={loadPopularContent} disabled={!hasDevice || loading}>
            {loading ? 'מרענן...' : 'רענון'}
          </Button>
        }
      />

      {devicesError ? <ErrorBanner message={devicesError} onRetry={reloadDevices} /> : null}
      {error ? <ErrorBanner message={error} onRetry={loadPopularContent} /> : null}

      <Card>
        <CardHeader title="מכשיר" />
        <CardBody>
          <div className="max-w-md">
            <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              {deviceOptions.length === 0 ? <option value="">אין מכשירים</option> : null}
              {deviceOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.age ? `(גיל ${d.age})` : ''}
                </option>
              ))}
            </Select>
          </div>
          
          {selectedDevice && (
            <div className="mt-3 text-sm text-slate-600">
              מציג תוכן פופולרי בקרב בני {selectedDevice.age} בישראל
            </div>
          )}
        </CardBody>
      </Card>

      {loading ? (
        <Card>
          <CardBody>
            <LoadingLogo message="טוען תוכן פופולרי..." />
          </CardBody>
        </Card>
      ) : !hasDevice ? (
        <EmptyState title="לא נבחר מכשיר" subtitle="בחרו מכשיר כדי לראות תוכן פופולרי." />
      ) : !selectedDevice?.age ? (
        <EmptyState title="אין גיל למכשיר" subtitle="הגיל נדרש כדי להציג תוכן פופולרי." />
      ) : !popularContent ? (
        <EmptyState title="אין נתונים" subtitle="לא ניתן לטעון תוכן פופולרי כרגע." />
      ) : (
        <>
          {popularContent.summary && (
            <Card>
              <CardHeader title="סיכום" />
              <CardBody>
                <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50 p-4">
                  <div className="text-sm text-slate-700">{popularContent.summary}</div>
                </div>
              </CardBody>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {popularContent.socialMedia && popularContent.socialMedia.length > 0 && (
              <Card>
                <CardHeader title="📱 רשתות חברתיות ומגמות" />
                <CardBody>
                  <div className="space-y-2">
                    {popularContent.socialMedia.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="text-sm text-slate-800">{item}</div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {popularContent.entertainment && popularContent.entertainment.length > 0 && (
              <Card>
                <CardHeader title="🎬 בידור ומוזיקה" />
                <CardBody>
                  <div className="space-y-2">
                    {popularContent.entertainment.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="text-sm text-slate-800">{item}</div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {popularContent.gaming && popularContent.gaming.length > 0 && (
              <Card>
                <CardHeader title="🎮 משחקים" />
                <CardBody>
                  <div className="space-y-2">
                    {popularContent.gaming.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="text-sm text-slate-800">{item}</div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {popularContent.lifestyle && popularContent.lifestyle.length > 0 && (
              <Card>
                <CardHeader title="✨ אורח חיים ואפליקציות" />
                <CardBody>
                  <div className="space-y-2">
                    {popularContent.lifestyle.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="text-sm text-slate-800">{item}</div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {popularContent.topics && popularContent.topics.length > 0 && (
              <Card>
                <CardHeader title="💬 נושאי שיחה נוכחיים" />
                <CardBody>
                  <div className="space-y-2">
                    {popularContent.topics.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="text-sm text-slate-800">{item}</div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}