import PropTypes from 'prop-types';

export function PageHeader({ title, subtitle, badge, action }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        {badge && <div className="mt-1.5">{badge}</div>}
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  badge: PropTypes.node,
  action: PropTypes.node,
};
