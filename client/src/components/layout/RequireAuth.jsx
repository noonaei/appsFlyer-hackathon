import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../context/AuthContext';

export default function RequireAuth() {
  const { bootstrapped, isAuthed } = useAuth();

  if (!bootstrapped) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-soft">
          <div className="text-sm text-slate-600">Loading session…</div>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
