export function PageTitle({ title, subtitle, right }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="float-animation">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          <span className="sparkle-animation">✨</span>
          {title}
          <span className="sparkle-animation">✨</span>
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-gradient-card backdrop-blur-sm shadow-soft border border-white/20 cute-hover ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200/50 px-6 py-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-medium transition-smooth focus-ring disabled:opacity-50 disabled:cursor-not-allowed cute-hover';
  const styles = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-glow',
    secondary: 'bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200 hover:bg-white hover:shadow-md',
    danger: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-600 hover:to-rose-700 shadow-lg',
    ghost: 'bg-transparent text-slate-700 hover:bg-white/50 backdrop-blur-sm',
  };
  return (
    <button 
      className={`${base} ${styles[variant]} ${className}`} 
      onClick={(e) => {
        e.currentTarget.classList.add('bounce-cute');
        setTimeout(() => e.currentTarget.classList.remove('bounce-cute'), 600);
        if (props.onClick) props.onClick(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, hint, error, className = '', ...props }) {
  return (
    <label className="block">
      {label ? <div className="mb-2 text-sm font-medium text-slate-700">{label}</div> : null}
      <input
        className={`w-full rounded-2xl border px-4 py-3 text-sm bg-white/80 backdrop-blur-sm transition-smooth focus-ring ${
          error ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-200 focus:border-primary-300'
        } ${className}`}
        {...props}
      />
      {error ? <div className="mt-1 text-xs text-rose-600">{error}</div> : null}
      {hint && !error ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </label>
  );
}

export function Select({ label, className = '', children, ...props }) {
  return (
    <label className="block">
      {label ? <div className="mb-2 text-sm font-medium text-slate-700">{label}</div> : null}
      <select
        className={`w-full rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm transition-smooth focus-ring focus:border-primary-300 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function InlinePill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-slate-100/80 text-slate-700 border border-slate-200',
    low: 'bg-yellow-50/80 text-yellow-800 border border-yellow-200',
    medium: 'bg-amber-50/80 text-amber-800 border border-amber-200',
    high: 'bg-red-50/80 text-red-800 border border-red-200',
    critical: 'bg-red-100/80 text-red-900 border border-red-300 font-semibold',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/60 ${className}`} />;
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 backdrop-blur-sm px-5 py-4">
      <div className="text-sm font-semibold text-rose-900">Something went wrong</div>
      <div className="mt-1 text-sm text-rose-800">{message}</div>
      {onRetry ? (
        <div className="mt-3">
          <Button variant="secondary" onClick={onRetry}>Retry</Button>
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="rounded-2xl border border-slate-200/50 bg-gradient-card backdrop-blur-sm px-6 py-8 shadow-soft text-center cute-hover">
      <div className="text-6xl mb-4 sparkle-animation">🌸</div>
      <div className="text-base font-semibold text-slate-800">{title}</div>
      {subtitle ? <div className="mt-2 text-sm text-slate-600">{subtitle}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
