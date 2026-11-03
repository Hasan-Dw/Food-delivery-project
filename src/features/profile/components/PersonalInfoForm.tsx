import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Undo2 } from 'lucide-react';
import type { User } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/FormAlert';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/stores/toast-store';
import { services } from '@/services';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/services/api/errors';
import { profileSchema, type ProfileValues } from '@/lib/validation';

export function PersonalInfoForm({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const notify = useToast();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ProfileValues) => services.users.updateProfile(values),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile, updated);
      updateUser(updated);
      reset({ fullName: updated.fullName, email: updated.email, phone: updated.phone });
      notify({
        tone: 'success',
        title: 'Profile saved',
        description: 'Your details are up to date for this demo session.',
      });
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <section id="details" aria-labelledby="details-heading" className="scroll-mt-28">
      <SectionFrame
        id="details"
        eyebrow="About you"
        title="Personal details"
        description="The name on the order, and the best way to reach you if dinner needs a conversation."
      >
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <FormAlert message={formError} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Full name"
              autoComplete="name"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <Input
              label="Phone number"
              type="tel"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            hint="In this prototype, changing your email only updates the local demo account."
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!isDirty}
              iconLeft={<Save aria-hidden="true" className="h-4 w-4" />}
            >
              Save changes
            </Button>
            {isDirty ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset();
                  setFormError(null);
                }}
                iconLeft={<Undo2 aria-hidden="true" className="h-4 w-4" />}
              >
                Discard
              </Button>
            ) : (
              <p className="text-[0.75rem] text-olive-500">Everything is up to date.</p>
            )}
          </div>
        </form>
      </SectionFrame>
    </section>
  );
}

interface SectionFrameProps {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  id?: string;
}

/** Shared visual frame for profile panels. */
export function SectionFrame({ eyebrow, title, description, children, action, id }: SectionFrameProps) {
  return (
    <div className="overflow-hidden rounded-panel border border-olive-900/10 bg-cream shadow-[0_1px_0_rgba(73,56,46,0.03)]">
      <div className="flex flex-col gap-4 border-b border-olive-900/8 px-6 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <div>
          <p className="eyebrow text-terracotta-600">{eyebrow}</p>
          <h2 id={id ? `${id}-heading` : undefined} className="mt-3 text-[1.6rem] leading-tight">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-xl text-[0.8125rem] leading-relaxed text-olive-500">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-7">{children}</div>
    </div>
  );
}
