import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Mail, MailCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DemoAccountNotice } from '@/features/auth/components/DemoAccountNotice';
import { FormAlert } from '@/components/ui/FormAlert';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/validation';
import { getErrorMessage } from '@/services/api/errors';
import { ROUTES } from '@/config/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface LocationState {
  from?: string;
}

export default function ForgotPasswordPage() {
  useDocumentTitle('Reset your password');
  const { requestPasswordReset } = useAuth();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const from = state?.from?.startsWith('/') ? state.from : ROUTES.profile;

  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await requestPasswordReset(values.email);
      setSentTo(values.email);
      setMessage(result);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  const tryAgain = () => {
    setSentTo(null);
    setMessage(null);
    setFormError(null);
    reset({ email: getValues('email') });
  };

  if (sentTo) {
    return (
      <div>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-olive-700 text-cream">
          <MailCheck aria-hidden="true" className="h-6 w-6" />
        </span>
        <p className="eyebrow mt-6 text-terracotta-600">Check your inbox</p>
        <h1 className="mt-4 text-[clamp(2.1rem,3.2vw,2.7rem)] leading-[1.04]">
          A reset link is <em className="italic text-terracotta">on its way.</em>
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-olive-500">
          If <span className="font-medium text-olive-800">{sentTo}</span> is registered with Savora, a reset link is on
          its way. It expires in 30 minutes.
        </p>

        <div className="mt-6 rounded-2xl border border-gold-300/50 bg-gold-50/80 p-4">
          <p className="text-[0.8125rem] font-semibold text-olive-800">This is a demo — no email was sent.</p>
          <p className="mt-1.5 text-[0.75rem] leading-relaxed text-olive-600">
            {message ?? 'A real backend would deliver the reset email here.'} Nothing has changed in your demo account.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3">
          <Link
            to={ROUTES.login}
            state={{ from }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-terracotta-600 px-6 text-sm font-medium text-cream shadow-soft transition hover:bg-terracotta-700 hover:shadow-lift"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to sign in
          </Link>
          <button
            type="button"
            onClick={tryAgain}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-olive-900/15 bg-cream px-5 py-3 text-[0.8125rem] font-medium text-olive-700 transition hover:border-olive-900/30 hover:bg-white"
          >
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            Use a different email
          </button>
        </div>

        <p className="mt-6 text-center text-[0.6875rem] leading-relaxed text-olive-500">
          Still stuck? Email{' '}
          <a href="mailto:hello@savora.co" className="font-medium text-olive-600 underline-offset-4 hover:underline">
            hello@savora.co
          </a>{' '}
          and a human will help.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow text-terracotta-600">Password help</p>
      <h1 className="mt-4 text-[clamp(2.2rem,3.4vw,2.9rem)] leading-[1.03]">
        Forgot your <em className="italic text-terracotta">password?</em>
      </h1>
      <p className="mt-3.5 text-[0.9375rem] leading-relaxed text-olive-500">
        It happens. Enter the email address on your account and, if it exists, we will send a link to reset your
        password.
      </p>

      <DemoAccountNotice variant="reset" className="mt-6" />

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
          hint="We will never reveal whether an address is registered."
          {...register('email')}
        />

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          Send reset link
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </form>

      <Link
        to={ROUTES.login}
        state={{ from }}
        className="mt-7 inline-flex items-center gap-2 text-[0.8125rem] font-medium text-olive-600 transition hover:text-terracotta-600"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        Back to sign in
      </Link>

      <p className="mt-6 border-t border-olive-900/10 pt-5 text-[0.6875rem] leading-relaxed text-olive-500">
        For your protection, the response is deliberately generic. In this prototype no email is sent and no password
        is changed.
      </p>
    </div>
  );
}
