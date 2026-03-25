import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'api-keys',     label: 'API Keys',     path: '/app/settings/api-keys' },
  { id: 'service-keys', label: 'Service Keys', path: '/app/settings/service-keys' },
  { id: 'account',      label: 'Account',      path: '/app/settings/account' },
];

const activeClass = 'px-4 py-2 text-sm font-medium text-text-primary border-b-2 border-accent -mb-px focus:outline-none focus:ring-2 focus:ring-accent/20 rounded-t-sm';
const inactiveClass = 'px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 rounded-t-sm';

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage keys and integrations" />
      <nav aria-label="Settings navigation">
        <div className="flex flex-wrap gap-1 border-b border-surface-border">
          {TABS.map(tab => (
            <NavLink
              key={tab.id}
              to={tab.path}
              className={({ isActive }) => isActive ? activeClass : inactiveClass}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </>
  );
}

export function AccountTab() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-4 animate-fadeInUp">
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Profile</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-text-tertiary mb-0.5">Username</p>
            <p className="text-sm text-text-primary">{user.username}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary mb-0.5">Email</p>
            <p className="text-sm text-text-primary">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-2">Password & Security</h2>
        <p className="text-sm text-text-tertiary">Password management coming soon.</p>
      </div>
    </div>
  );
}
