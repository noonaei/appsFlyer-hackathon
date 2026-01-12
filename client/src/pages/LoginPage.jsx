import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button, Card, CardBody, CardHeader, Input } from '../components/common/FirstButton/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate('/devices');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Login failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 float-animation">
          <img src="/src/assets/mascot_logo.png" alt="Kid Connect" className="w-32 h-32 mx-auto mb-4 object-contain flex-shrink-0" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent" dir="ltr">
            Kid Connect
          </h1>
          <p className="mt-2 text-sm text-slate-600">ברוכים השבים ללוח הבקרה</p>
        </div>
        
        <Card className="cute-hover">
          <CardHeader 
            title="התחברות" 
            subtitle="השתמשו בחשבון ההורה שלכם לגישה לדוחות." 
          />
          <CardBody>
            <form onSubmit={onSubmit} className="flex flex-col gap-5">
              <Input 
                label="אימייל" 
                type="email" 
                autoComplete="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
              <Input 
                label="סיסמה" 
                type="password" 
                autoComplete="current-password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 backdrop-blur-sm px-4 py-3 text-sm text-rose-800">
                  {error}
                </div>
              ) : null}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'מתחבר...' : 'התחברות'}
              </Button>

              <div className="text-sm text-slate-600 text-center">
                אין לכם חשבון?{' '}
                <Link 
                  to="/signup" 
                  className="font-medium text-primary-600 hover:text-primary-700 transition-smooth"
                >
                  צרו חשבון
                </Link>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
