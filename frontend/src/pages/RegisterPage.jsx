import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import Stepper, { Step } from '../components/auth/Stepper';
import SocialAuth from '../components/auth/SocialAuth';
import ProfilePreview from '../components/auth/ProfilePreview';

const LINK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const INPUT_CLASS = 'w-full px-4 py-3 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors';

function isStepValid(step, formData) {
  switch (step) {
    case 1: return /\S+@\S+\.\S+/.test(formData.email);
    case 2: return formData.username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(formData.username);
    case 3: return formData.password.length >= 8;
    default: return false;
  }
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error, register, clearError } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });

  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

  function handleStepChange(step) {
    setCurrentStep(step);
    clearError();
  }

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRegister() {
    if (!isStepValid(3, formData)) return;
    await register(formData.email, formData.username, formData.password);
  }

  const isLastStep = currentStep === 3;

  const nextButtonProps = {
    disabled: !isStepValid(currentStep, formData) || (isLastStep && isLoading),
    ...(isLastStep && { onClick: handleRegister }),
  };

  return (
    <AuthLayout rightPanel={<ProfilePreview username={formData.username} />}>
      <div className="w-10 h-10 mb-7 text-text-primary">
        {LINK_ICON}
      </div>

      <Stepper
        onStepChange={handleStepChange}
        onFinalStepCompleted={() => { }}
        nextButtonProps={nextButtonProps}
        lastStepText={isLoading ? 'Creating...' : 'Create account'}
        disableStepIndicators
      >
        <Step>
          <h2 className="text-xl font-semibold text-text-primary mb-1">Create your account</h2>
          <p className="text-sm text-text-secondary mb-5">Start with your email address.</p>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className={INPUT_CLASS}
            placeholder="you@example.com"
            autoFocus
          />
          <SocialAuth />
        </Step>

        <Step>
          <h2 className="text-xl font-semibold text-text-primary mb-1">Choose a username</h2>
          <p className="text-sm text-text-secondary mb-5">This will be your @username on Quorum.</p>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => updateField('username', e.target.value)}
            className={INPUT_CLASS}
            placeholder="username"
            autoFocus
          />
        </Step>

        <Step>
          <h2 className="text-xl font-semibold text-text-primary mb-1">Set your password</h2>
          <p className="text-sm text-text-secondary mb-5">Must be at least 8 characters.</p>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            className={INPUT_CLASS}
            placeholder="Min. 8 characters"
            autoFocus
          />
          {error && <p className="text-sm text-verdict-fail mt-3">{error}</p>}
        </Step>
      </Stepper>

      <p className="mt-6 text-sm text-text-secondary">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
