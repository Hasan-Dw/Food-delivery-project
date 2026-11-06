import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Mail } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { DemoAccountNotice } from '@/features/auth/components/DemoAccountNotice';
import { FormAlert } from '@/components/ui/FormAlert';
import { loginSchema, type LoginValues } from '@/lib/validation';
import { roleLandingPath } from '@/lib/permissions';
import { getErrorMessage } from '@/services/api/errors';
import { site } from '@/config/site';
import { ROUTES } from '@/config/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface LocationState {
  from?: string;
}

/** Sign-in screen. The demo disclosure is part of the interface, not a footnote. */
export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { signIn, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const from = state?.from?.startsWith('/') ? state.from : user ? roleLandingPath(user.role) : ROUTES.profile;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  const fillDemo = () => {
    setFormError(null);
    reset({ email: site.demo.email, password: site.demo.password, remember: true });
  };

  return (
    <div>
      <p className="eyebrow text-terracotta-600">Welcome back</p>
      <h1 className="mt-4 text-[clamp(2.2rem,3.4vw,2.9rem)] leading-[1.03]">
        Good to see you <em className="italic text-terracotta">again.</em>
      </h1>
      <p className="mt-3.5 text-[0.9375rem] leading-relaxed text-olive-500">
        Sign in to reorder favourites, manage delivery addresses and follow an order from kitchen to doorstep.
      </p>

      <DemoAccountNotice variant="login" onUseDemo={fillDemo} className="mt-6" />

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <FormAlert message={formError} />

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="maya@example.com"
          leading={<Mail aria-hidden="true" className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox label="Keep me signed in" {...register('remember')} />
          <Link
            to={ROUTES.forgotPassword}
            state={{ from }}
            className="text-[0.8125rem] font-medium text-olive-600 underline-offset-4 transition hover:text-terracotta-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          Sign in
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-7 text-center text-[0.8125rem] text-olive-500">
        New to Savora?{' '}
        <Link
          to={ROUTES.register}
          state={{ from }}
          className="font-medium text-terracotta-600 underline-offset-4 transition hover:text-terracotta-700 hover:underline"
        >
          Create an account
        </Link>
      </p>

      <p className="mt-6 border-t border-olive-900/10 pt-5 text-center text-[0.6875rem] leading-relaxed text-olive-500">
        This is a frontend prototype. Sign-in is simulated in your browser, the session is not encrypted, and no real
        credentials should be entered. Questions?{' '}
        <a href={`mailto:${site.email}`} className="font-medium text-olive-600 underline-offset-4 hover:underline">
          Talk to the team.
        </a>
      </p>
    </div>
  );
}
