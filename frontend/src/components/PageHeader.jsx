import PropTypes from 'prop-types';

export function PageHeader({ title, subtitle, badge, action, icon: Icon }) {
  return (
    <div className="animate-fadeInUp">
      <div className="h-0.5 bg-gradient-to-r from-accent to-transparent rounded-full mb-6" />
      <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="w-9 h-9 shrink-0 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-accent shadow-sm">
              <Icon size={17} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
            {badge && <div className="mt-1.5">{badge}</div>}
            {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  badge: PropTypes.node,
  action: PropTypes.node,
  icon: PropTypes.elementType,
};
