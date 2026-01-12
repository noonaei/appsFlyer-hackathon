import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/FirstButton/ui';
import backBtn from '../../assets/backBtn.png';
import homeBtn from '../../assets/homeBtn.png';

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `block rounded-2xl px-4 py-3 text-sm font-medium transition-smooth ${
          isActive 
            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg' 
            : 'text-slate-700 hover:bg-white/50 hover:text-slate-800'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function HeaderButtons() {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center gap-2 mb-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="text-xs px-3 py-2"
      >
        <img src={backBtn} alt="חזור" className="w-4 h-4" />
      </Button>
      <Button 
        variant="ghost" 
        onClick={() => navigate('/devices')}
        className="text-xs px-3 py-2"
      >
        <img src={homeBtn} alt="בית" className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function AppShell() {
  const { logout, parentName } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Top header with KidConnect title */}
      <header className="bg-gradient-card backdrop-blur-sm shadow-soft border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-center">
            <div className="float-animation">
              <div className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent flex items-center gap-2">
                <img src="/src/assets/mascot_logo.png" alt="KidConnect" className="w-16 h-16 object-contain flex-shrink-0" />
                <span className="sparkle-animation">🌸</span>
                <span dir="ltr">KidConnect</span>
                <span className="sparkle-animation">🌸</span>
              </div>
              <div className="text-xs text-slate-600 text-center">לוח בקרה הורים</div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[1fr_280px]" dir="rtl">
        <main className="min-w-0">
          <HeaderButtons />
          <Outlet />
        </main>

        <aside className="rounded-2xl bg-gradient-card backdrop-blur-sm shadow-soft border border-white/20 cute-hover">
          <div className="flex items-center justify-between border-b border-slate-200/50 px-6 py-5">
            <div className="rounded-2xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-100 px-4 py-3 cute-hover">
              <div className="text-xs text-slate-600 flex items-center gap-1">
                <span>👩👧👦</span>
                מחובר כ
              </div>
              <div className="text-sm font-semibold text-slate-800">{parentName || 'הורה'}</div>
            </div>
            <Button variant="ghost" onClick={logout} className="text-xs px-3 py-1.5">
              יציאה
            </Button>
          </div>

          <div className="px-4 py-5">
            <nav className="flex flex-col gap-2">
              <NavItem to="/devices" label="📱 מכשירים" />
              <NavItem to="/daily" label="📊 סיכום יומי" />
              <NavItem to="/alerts" label="🚨 התראות" />
              <NavItem to="/weekly" label="📈 מגמות שבועיות" />
              <NavItem to="/popular" label="🔥 מה פופולרי?" />
              <NavItem to="/settings" label="⚙️ הגדרות" />
            </nav>
          </div>
        </aside>
      </div>
      
      <footer className="bg-white/10 backdrop-blur-sm border-t border-white/20 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-slate-500 space-y-2">
          <div>© 2026 KidConnect - צוות הפיתוח: נוגה נפנה ושני</div>
          <div>
            <button 
              onClick={() => window.open('/privacy', '_blank')} 
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              מדיניות פרטיות
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}