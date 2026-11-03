import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Check, Mail, User } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { DemoAccountNotice } from '@/features/auth/components/DemoAccountNotice';
import { FormAlert } from '@/components/ui/FormAlert';
import { getPasswordStrength, registerSchema, type RegisterValues } from '@/lib/validation';
import { getErrorMessage } from '@/services/api/errors';
import { ROUTES } from '@/config/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/cn';

interface LocationState {
  from?: string;
}

export default function RegisterPage() {
  useDocumentTitle('Create an account');
  const { signUp, isAuthenticated } = useAuth();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const from = state?.from?.startsWith('/') ? state.from : ROUTES.profile;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');
  const strength = getPasswordStrength(password);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signUp({ fullName: values.fullName, email: values.email, password: values.password });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <div>
      <p className="eyebrow text-terracotta-600">Join the table</p>
      <h1 className="mt-4 text-[clamp(2.2rem,3.4vw,2.9rem)] leading-[1.03]">
        Pull up a <em className="italic text-terracotta">chair.</em>
      </h1>
      <p className="mt-3.5 text-[0.9375rem] leading-relaxed text-olive-500">
        One account for every kitchen worth knowing in your neighbourhood. Save addresses, reorder favourites and keep
        track of dinner.
      </p>

      <DemoAccountNotice variant="register" className="mt-6" />

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <FormAlert message={formError} />

        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Maya Bennett"
          leading={<User aria-hidden="true" className="h-4 w-4" />}
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          leading={<Mail aria-hidden="true" className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <PasswordInput
            label="Create a password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="mt-2.5" aria-live="polite">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors duration-300',
                    index < strength.score ? strengthBarTone(strength.score) : 'bg-olive-900/10',
                  )}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
              {strength.checks.map((check) => (
                <span
                  key={check.label}
                  className={cn(
                    'inline-flex items-center gap-1 text-[0.625rem]',
                    check.met ? 'text-olive-600' : 'text-olive-500',
                  )}
                >
                  <Check
                    aria-hidden="true"
                    className={cn('h-2.5 w-2.5', check.met ? 'text-success' : 'text-olive-300')}
                  />
                  {check.label}
                </span>
              ))}
              <span className="ml-auto text-[0.625rem] font-medium text-olive-500">{strength.label}</span>
            </div>
          </div>
        </div>

        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Type it once more"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          Create account
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-7 text-center text-[0.8125rem] text-olive-500">
        Already have an account?{' '}
        <Link
          to={ROUTES.login}
          state={{ from }}
          className="font-medium text-terracotta-600 underline-offset-4 transition hover:text-terracotta-700 hover:underline"
        >
          Sign in
        </Link>
      </p>

      <p className="mt-6 border-t border-olive-900/10 pt-5 text-center text-[0.6875rem] leading-relaxed text-olive-500">
        By creating a demo account you agree that this is a prototype, not a real service. Accounts exist only for this
        browser tab and are cleared when it closes.
      </p>
    </div>
  );
}

function strengthBarTone(score: number): string {
  if (score <= 1) return 'bg-danger/70';
  if (score === 2) return 'bg-gold-400';
  if (score === 3) return 'bg-olive-500';
  return 'bg-success';
}
