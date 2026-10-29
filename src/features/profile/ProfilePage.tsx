import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, KeyRound, Loader2, ArrowLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import { useT } from '../../i18n';
import { ThemeToggle, LanguageToggle } from '../../components/ThemeToggle';

type Feedback = { kind: 'success' | 'error'; text: string } | null;

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatarUrl);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  if (!user) return null;

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      setUser(res.data.data);
      setFeedback({ kind: 'success', text: t('profileUpdated') });
    } catch (err: any) {
      setFeedback({ kind: 'error', text: err.response?.data?.message || t('saveFailed') });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ kind: 'error', text: t('passwordsDoNotMatch') });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({ kind: 'error', text: t('passwordTooShort') });
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({ kind: 'success', text: t('passwordChanged') });
    } catch (err: any) {
      setPasswordFeedback({ kind: 'error', text: err.response?.data?.message || t('saveFailed') });
    } finally {
      setSavingPassword(false);
    }
  };

  const onPickAvatar = () => fileInputRef.current?.click();

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ kind: 'error', text: t('imageOnly') });
      return;
    }
    setFeedback(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await api.post('/auth/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(res.data.data);
      setAvatarUrl(res.data.data.avatarUrl);
      setFeedback({ kind: 'success', text: t('photoUpdated') });
    } catch (err: any) {
      setFeedback({ kind: 'error', text: err.response?.data?.message || t('saveFailed') });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="h-16 bg-surface border-b border-line px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-3 cursor-pointer text-left focus:outline-none"
          title={t('back') || "Back"}
        >
          {/* Logo with smooth back-arrow hover transition */}
          <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="Vital Security"
              className="w-full h-full object-contain transition-all duration-200 group-hover:opacity-0 group-hover:scale-75"
            />
            <div className="absolute inset-0 rounded-xl bg-subtle text-ink flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 shadow-xs border border-line">
              <ArrowLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-ink tracking-tight group-hover:text-primary-600 transition-colors">
              Vital Security
            </span>
            <span className="text-muted/40 font-light text-sm">/</span>
            <span className="text-sm font-semibold text-muted group-hover:text-ink transition-colors">
              {t('myProfile')}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageToggle />
          <ThemeToggle />
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors ml-0.5"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Identity card */}
        <div className="v-card p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt={initials} className="w-20 h-20 rounded-full object-cover shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold shadow-md">
                  {initials || '?'}
                </div>
              )}
              <button
                type="button"
                onClick={onPickAvatar}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md hover:bg-primary-700 disabled:opacity-60 transition-colors"
                title={t('changePhoto')}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarChange}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-ink truncate">{user.firstName} {user.lastName}</h1>
              <p className="text-sm text-muted capitalize">{user.role?.replace(/_/g, ' ').toLowerCase()}</p>
              <p className="text-sm text-muted mt-1 font-mono">{user.email}</p>
            </div>
          </div>

          {feedback && (
            <div
              className={`mt-4 p-3 rounded-xl text-sm border ${
                feedback.kind === 'success'
                  ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>

        {/* Edit details */}
        <form onSubmit={saveProfile} className="v-card p-6 space-y-4">
          <h2 className="text-base font-semibold text-ink">{t('contactInfo')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="v-label">{t('firstName')}</label>
              <input className="v-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="v-label">{t('lastName')}</label>
              <input className="v-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="v-label">{t('phone')}</label>
            <input
              className="v-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+251 9XX XXX XXX"
              type="tel"
            />
          </div>
          <div>
            <label className="v-label">{t('email')}</label>
            <input className="v-input opacity-60 cursor-not-allowed" value={user.email} disabled readOnly />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {savingProfile ? t('saving') : t('saveChanges')}
            </button>
          </div>
        </form>

        {/* Change password */}
        <form onSubmit={changePassword} className="v-card p-6 space-y-4">
          <h2 className="text-base font-semibold text-ink flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary-600" />
            {t('changePassword')}
          </h2>
          {passwordFeedback && (
            <div
              className={`p-3 rounded-xl text-sm border ${
                passwordFeedback.kind === 'success'
                  ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
              }`}
            >
              {passwordFeedback.text}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="v-label">{t('currentPassword')}</label>
              <input
                className="v-input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="v-label">{t('newPassword')}</label>
              <input
                className="v-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="v-label">{t('confirmPassword')}</label>
              <input
                className="v-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {savingPassword ? t('saving') : t('updatePassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
