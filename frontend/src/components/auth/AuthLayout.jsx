import { Link } from 'react-router-dom';

export default function AuthLayout({ children, rightPanel }) {
  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[960px]">
        <div className="text-center mb-8">
          <Link to="/" className="text-lg font-semibold text-text-primary tracking-tight">
            RAGScope
          </Link>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[520px]">
          <div className="p-10 md:p-12 flex flex-col justify-center border-r border-surface-border">
            {children}
          </div>
          {rightPanel}
        </div>

        <p className="text-center mt-6 text-sm text-text-tertiary">
          <Link to="/" className="hover:text-text-secondary transition-colors">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
