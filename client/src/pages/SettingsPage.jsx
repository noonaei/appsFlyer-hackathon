import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useDevices } from '../hooks/useDevices';
import api from '../services/api';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  PageTitle,
  EmptyState,
} from '../components/common/FirstButton/ui';

export default function SettingsPage() {
  const { parentName, logout, updateParentName } = useAuth();
  const { devices, reload } = useDevices();
  const navigate = useNavigate();

  const [parentNameInput, setParentNameInput] = useState(parentName || '');
  const [isUpdatingParent, setIsUpdatingParent] = useState(false);
  const [parentError, setParentError] = useState('');

  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [deviceAgeInput, setDeviceAgeInput] = useState('');
  const [isUpdatingDevice, setIsUpdatingDevice] = useState(false);
  const [deviceError, setDeviceError] = useState('');

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleUpdateParentName() {
    if (!parentNameInput.trim()) return;
    
    setParentError('');
    setIsUpdatingParent(true);
    try {
      await updateParentName(parentNameInput.trim());
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to update name';
      setParentError(msg);
    } finally {
      setIsUpdatingParent(false);
    }
  }

  async function updateDeviceName(deviceId) {
    if (!deviceNameInput.trim()) return;
    
    const updateData = { name: deviceNameInput.trim() };
    const age = parseInt(deviceAgeInput);
    if (age && age >= 1 && age <= 18) {
      updateData.age = age;
    }
    
    setDeviceError('');
    setIsUpdatingDevice(true);
    try {
      await api.devices.update({ deviceId, ...updateData });
      setEditingDevice(null);
      setDeviceNameInput('');
      setDeviceAgeInput('');
      await reload();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to update device';
      setDeviceError(msg);
    } finally {
      setIsUpdatingDevice(false);
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm('האם אתם בטוחים שברצונכם למחוק את החשבון? פעולה זו תמחק את כל הנתונים ולא ניתן לבטלה.');
    if (!confirmed) return;

    setDeleteError('');
    setIsDeletingAccount(true);
    try {
      await api.parents.delete();
      logout();
      navigate('/login');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to delete account';
      setDeleteError(msg);
    } finally {
      setIsDeletingAccount(false);
    }
  }

  function startEditingDevice(device) {
    setEditingDevice(device._id || device.id);
    setDeviceNameInput(device.name || '');
    setDeviceAgeInput(String(device.age || ''));
    setDeviceError('');
  }

  function cancelEditingDevice() {
    setEditingDevice(null);
    setDeviceNameInput('');
    setDeviceAgeInput('');
    setDeviceError('');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="הגדרות"
        subtitle="נהלו את פרטי החשבון והמכשירים שלכם."
      />

      <Card>
        <CardHeader title="פרטי הורה" />
        <CardBody>
          <div className="flex flex-col gap-4">
            <Input
              label="שם"
              value={parentNameInput}
              onChange={(e) => setParentNameInput(e.target.value)}
              disabled={isUpdatingParent}
            />
            
            {parentError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 backdrop-blur-sm px-4 py-3 text-sm text-rose-800">
                {parentError}
              </div>
            )}

            <div>
              <Button 
                onClick={handleUpdateParentName} 
                disabled={isUpdatingParent || !parentNameInput.trim()}
              >
                {isUpdatingParent ? 'מעדכן...' : 'עדכון שם'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="מכשירים" subtitle="עדכנו שמות המכשירים שלכם." />
        <CardBody>
          {deviceError && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 backdrop-blur-sm px-4 py-3 text-sm text-rose-800">
              {deviceError}
            </div>
          )}

          {!devices || devices.length === 0 ? (
            <EmptyState
              title="אין מכשירים"
              subtitle="עברו לעמוד המכשירים כדי להוסיף מכשיר."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {devices.map((device) => {
                const deviceId = device._id || device.id;
                const isEditing = editingDevice === deviceId;

                return (
                  <div
                    key={deviceId}
                    className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-3"
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Input
                            label="שם מכשיר"
                            value={deviceNameInput}
                            onChange={(e) => setDeviceNameInput(e.target.value)}
                            disabled={isUpdatingDevice}
                          />
                          <Input
                            label="גיל"
                            type="number"
                            min="1"
                            max="18"
                            value={deviceAgeInput}
                            onChange={(e) => setDeviceAgeInput(e.target.value)}
                            disabled={isUpdatingDevice}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => updateDeviceName(deviceId)}
                            disabled={isUpdatingDevice || !deviceNameInput.trim()}
                          >
                            {isUpdatingDevice ? 'שומר...' : 'שמירה'}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={cancelEditingDevice}
                            disabled={isUpdatingDevice}
                          >
                            ביטול
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-800">
                            {device.name || 'מכשיר ללא שם'}
                          </div>
                          <div className="text-xs text-slate-600">
                            גיל: {device.age || 'לא צוין'}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => startEditingDevice(device)}
                        >
                          עריכה
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="מחיקת חשבון" />
        <CardBody>
          <div className="flex flex-col gap-4">
            <div className="text-sm text-slate-600">
              מחיקת החשבון תמחק לצמיתות את כל הנתונים, המכשירים והדוחות. פעולה זו אינה הפיכה.
            </div>

            {deleteError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 backdrop-blur-sm px-4 py-3 text-sm text-rose-800">
                {deleteError}
              </div>
            )}

            <div>
              <Button
                variant="danger"
                onClick={deleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? 'מוחק חשבון...' : 'מחיקת חשבון'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}