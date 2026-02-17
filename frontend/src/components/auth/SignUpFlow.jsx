import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SocialAuth from './SocialAuth';
import ProgressBar from './ProgressBar';

const STEPS = [
  {
    heading: 'Create your account',
    subheading: 'Start with your email address.',
    field: 'email',
  },
  {
    heading: 'Choose a username',
    subheading: 'This will be your public @username on RAGScope.',
    field: 'username',
  },
  {
    heading: 'Set your password',
    subheading: 'Must be at least 8 characters.',
    field: 'password',
  },
];

function isStepValid(step, formData) {
  switch (step) {
    case 1: return /\S+@\S+\.\S+/.test(formData.email);
    case 2: return formData.username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(formData.username);
    case 3: return formData.password.length >= 8;
    default: return false;
  }
}

export default function SignUpFlow({ onUsernameChange }) {
  const navigate = useNavigate();
  const { isLoading, error, register } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });

  const currentStep = STEPS[step - 1];
  const canProceed = isStepValid(step, formData);

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'username') onUsernameChange(value);
  }

  function handleBack() {
    if (step === 1) {
      navigate('/');
    } else {
      setStep(step - 1);
    }
  }

  async function handleContinue(e) {
    e.preventDefault();
    if (!canProceed) return;

    if (step < 3) {
      setStep(step + 1);
    } else {
      await register(formData.email, formData.username, formData.password);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-text-primary mb-2">{currentStep.heading}</h1>
      <p className="text-sm text-text-secondary mb-7">{currentStep.subheading}</p>

      <ProgressBar currentStep={step} />

      <form onSubmit={handleContinue} className="space-y-4">
        {step === 1 && (
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="w-full px-4 py-3 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            placeholder="you@example.com"
            autoFocus
          />
        )}

        {step === 1 && <SocialAuth />}

        {step === 2 && (
          <input
            type="text"
            value={formData.username}
            onChange={(e) => updateField('username', e.target.value)}
            className="w-full px-4 py-3 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            placeholder="john_doe"
            autoFocus
          />
        )}

        {step === 3 && (
          <input
            type="password"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            className="w-full px-4 py-3 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            placeholder="Min. 8 characters"
            autoFocus
          />
        )}

        {error && (
          <p className="text-sm text-verdict-fail">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleBack}
            className="w-11 h-11 rounded-full border border-surface-border bg-surface flex items-center justify-center text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="submit"
            disabled={!canProceed || isLoading}
            className="flex-1 py-3 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {step === 3 ? 'Create account' : 'Continue'}
          </button>
        </div>
      </form>
    </>
  );
}
