import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Zap, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import SignInForm from '../components/auth/SignInForm';

const FEATURES = [
  {
    Icon: Users,
    title: 'Council of LLMs',
    description: 'Three judges eliminate single-model blind spots',
  },
  {
    Icon: Zap,
    title: 'Adaptive routing',
    description: 'Picks the cheapest strategy that meets quality bar',
  },
  {
    Icon: Activity,
    title: 'Real-time streaming',
    description: 'Live cost + verdict updates as judges run',
  },
];

function SignInHero() {
  return (
    <div className="hidden md:flex flex-col justify-center p-10 md:p-12 bg-surface-secondary relative overflow-hidden">
      <div className="absolute top-0 right-0 w-52 h-52 bg-accent/5 rounded-full -translate-y-1/4 translate-x-1/4" />

      <div className="relative z-10">
        <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">What you get</p>
        <h2 className="text-xl font-semibold text-text-primary mb-8 leading-snug">
          Multi-model evaluation<br />built for production RAG
        </h2>

        <div className="flex flex-col gap-5">
          {FEATURES.map(({ Icon, title, description }) => (
            <div key={title} className="flex gap-3">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-accent">
                <Icon size={15} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{title}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <AuthLayout rightPanel={<SignInHero />}>
      <SignInForm />

      <p className="mt-6 text-sm text-text-secondary">
        New to Quorum?{' '}
        <Link to="/register" className="text-accent hover:text-accent-hover transition-colors">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
