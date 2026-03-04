import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const BG_STYLE = {
  background: [
    'radial-gradient(ellipse 80% 55% at 15% 20%, rgba(217,144,88,0.38) 0%, transparent 60%)',
    'radial-gradient(ellipse 55% 65% at 88% 78%, rgba(196,125,69,0.32) 0%, transparent 55%)',
    'radial-gradient(ellipse 45% 45% at 60% 8%,  rgba(235,170,100,0.22) 0%, transparent 50%)',
    '#EDE9E2',
  ].join(', '),
};

export default function AuthLayout({ children, rightPanel }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-12" style={BG_STYLE}>
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ChevronLeft size={15} />
        Home
      </Link>

      <div className="relative z-10 w-full max-w-[960px]">
        <div className="text-center mb-8">
          <Link to="/" className="text-lg font-semibold text-text-primary tracking-tight">
            Quorum
          </Link>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[520px]">
          <div className="p-10 md:p-12 flex flex-col justify-center border-r border-surface-border">
            {children}
          </div>
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
