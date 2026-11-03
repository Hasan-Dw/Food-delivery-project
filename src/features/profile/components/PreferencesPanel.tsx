import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Save } from 'lucide-react';
import type { DietaryPreference, User, UserPreferences } from '@/types';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/FormAlert';
import { SectionFrame } from './PersonalInfoForm';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/stores/toast-store';
import { services } from '@/services';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/services/api/errors';
import { cn } from '@/lib/cn';

const dietaryOptions: { value: DietaryPreference; label: string; description: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian', description: 'No meat or fish' },
  { value: 'vegan', label: 'Vegan', description: 'No animal products' },
  { value: 'gluten-free', label: 'Gluten-free', description: 'Avoid gluten' },
  { value: 'halal', label: 'Halal', description: 'Halal ingredients only' },
];

const notificationRows: {
  key: 'emailReceipts' | 'orderUpdates' | 'marketing';
  label: string;
  description: string;
}[] = [
  {
    key: 'emailReceipts',
    label: 'Email receipts',
    description: 'A tidy copy of every order, sent to your inbox.',
  },
  {
    key: 'orderUpdates',
    label: 'Order updates',
    description: 'Kitchen, driver and delivery milestones for active orders.',
  },
  {
    key: 'marketing',
    label: 'The Savora letter',
    description: 'New kitchens and seasonal menus, every other Thursday.',
  },
];

export function PreferencesPanel({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const notify = useToast();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const [dietary, setDietary] = useState<DietaryPreference[]>(user.preferences.dietary);
  const [notifications, setNotifications] = useState<Pick<UserPreferences, 'emailReceipts' | 'orderUpdates' | 'marketing'>>({
    emailReceipts: user.preferences.emailReceipts,
    orderUpdates: user.preferences.orderUpdates,
    marketing: user.preferences.marketing,
  });

  const isDirty = useMemo(() => {
    const dietaryChanged =
      dietary.length !== user.preferences.dietary.length ||
      dietary.some((item) => !user.preferences.dietary.includes(item));
    const notificationsChanged = notificationRows.some(
      (row) => notifications[row.key] !== user.preferences[row.key],
    );
    return dietaryChanged || notificationsChanged;
  }, [dietary, notifications, user.preferences]);

  const mutation = useMutation({
    mutationFn: (preferences: Partial<UserPreferences>) => services.users.updatePreferences(preferences),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile, updated);
      updateUser(updated);
      notify({
        tone: 'success',
        title: 'Preferences saved',
        description: 'We will use these for this demo session.',
      });
      setFormError(null);
    },
  });

  const toggleDietary = (value: DietaryPreference) => {
    setDietary((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const save = async () => {
    setFormError(null);
    try {
      await mutation.mutateAsync({ ...notifications, dietary });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <section id="preferences" aria-labelledby="preferences-heading" className="scroll-mt-28">
      <SectionFrame
        id="preferences"
        eyebrow="Made to measure"
        title="Preferences"
        description="A few details that make discovery feel less like searching and more like being known."
      >
        <div className="space-y-8">
          <div>
            <h3 className="text-[0.9375rem] font-semibold text-olive-900">Dietary preferences</h3>
            <p className="mt-1 text-[0.8125rem] text-olive-500">
              We will highlight suitable dishes. Always check the restaurant&apos;s own allergen notes before ordering.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {dietaryOptions.map((option) => {
                const selected = dietary.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleDietary(option.value)}
                    aria-pressed={selected}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition',
                      selected
                        ? 'border-olive-700 bg-olive-700 text-cream'
                        : 'border-olive-900/15 bg-ivory text-olive-600 hover:border-olive-900/30 hover:text-olive-900',
                    )}
                  >
                    {selected ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : null}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-olive-900/8 pt-7">
            <h3 className="text-[0.9375rem] font-semibold text-olive-900">Notifications</h3>
            <div className="mt-4 divide-y divide-olive-900/8">
              {notificationRows.map((row) => (
                <div key={row.key} className="flex items-start justify-between gap-5 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-[0.875rem] font-medium text-olive-800">{row.label}</p>
                    <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-olive-500">{row.description}</p>
                  </div>
                  <Switch
                    label={row.label}
                    checked={notifications[row.key]}
                    onChange={(checked) =>
                      setNotifications((current) => ({ ...current, [row.key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <FormAlert message={formError} />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={save}
              isLoading={mutation.isPending}
              disabled={!isDirty}
              iconLeft={<Save aria-hidden="true" className="h-4 w-4" />}
            >
              Save preferences
            </Button>
            {!isDirty ? <p className="text-[0.75rem] text-olive-500">No unsaved changes.</p> : null}
          </div>

          <p className="text-[0.6875rem] leading-relaxed text-olive-500">
            Notification settings are stored in the demo session. No emails are actually sent from this prototype.
          </p>
        </div>
      </SectionFrame>
    </section>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300',
        checked ? 'border-olive-700 bg-olive-700' : 'border-olive-900/20 bg-ivory-200',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-cream shadow-sm transition-transform duration-300',
          checked ? 'translate-x-[1.4rem]' : 'translate-x-1',
        )}
        aria-hidden="true"
      />
    </button>
  );
}
