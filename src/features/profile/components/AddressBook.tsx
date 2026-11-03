import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Check, Home, MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import type { Address } from '@/types';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormAlert } from '@/components/ui/FormAlert';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { SectionFrame } from './PersonalInfoForm';
import { useToast } from '@/stores/toast-store';
import { services } from '@/services';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/services/api/errors';
import { addressSchema, type AddressValues } from '@/lib/validation';
import { cn } from '@/lib/cn';

interface AddressBookProps {
  addresses: Address[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function AddressBook({ addresses, isLoading, isError, onRetry }: AddressBookProps) {
  const queryClient = useQueryClient();
  const notify = useToast();
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.addresses });

  const saveMutation = useMutation({
    mutationFn: async ({ values, id }: { values: AddressValues; id?: string }) => {
      const input = {
        ...values,
        line2: values.line2 || undefined,
        instructions: values.instructions || undefined,
      };
      return id
        ? services.users.updateAddress(id, input)
        : services.users.createAddress(input);
    },
    onSuccess: async (_, variables) => {
      await invalidate();
      setEditing(null);
      notify({
        tone: 'success',
        title: variables.id ? 'Address updated' : 'Address added',
        description: 'Your delivery addresses are up to date.',
      });
    },
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => services.users.setDefaultAddress(id),
    onSuccess: async (next) => {
      queryClient.setQueryData(queryKeys.addresses, next);
      notify({ tone: 'success', title: 'Default address updated' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => services.users.deleteAddress(id),
    onSuccess: async () => {
      await invalidate();
      setConfirmDelete(null);
      notify({ tone: 'success', title: 'Address removed' });
    },
  });

  const handleSave = async (values: AddressValues) => {
    await saveMutation.mutateAsync({ values, id: editing && editing !== 'new' ? editing.id : undefined });
  };

  return (
    <section id="addresses" aria-labelledby="addresses-heading" className="scroll-mt-28">
      <SectionFrame
        id="addresses"
        eyebrow="Where dinner lands"
        title="Delivery addresses"
        description="Keep the places you order to most often. The default address is used first at checkout."
        action={
          editing === null ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing('new')}
              iconLeft={<Plus aria-hidden="true" className="h-3.5 w-3.5" />}
            >
              Add address
            </Button>
          ) : null
        }
      >
        {editing ? (
          <div className="mb-7 rounded-2xl border border-olive-900/10 bg-ivory p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[1.1rem] text-olive-900">{editing === 'new' ? 'New address' : 'Edit address'}</h3>
                <p className="mt-1 text-[0.8125rem] text-olive-500">
                  Used only for delivery in this demo. Nothing is sent to a map provider.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close address form"
                className="flex h-8 w-8 items-center justify-center rounded-full text-olive-500 transition hover:bg-olive-900/5 hover:text-olive-700"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <AddressForm
              key={editing === 'new' ? 'new' : editing.id}
              initial={editing === 'new' ? undefined : editing}
              isDefaultAvailable={addresses.length === 0}
              onSubmit={handleSave}
            />
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-2xl bg-olive-900/5" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 p-5 text-[0.8125rem] text-danger">
            <p className="font-medium">We could not load your addresses.</p>
            <button type="button" onClick={onRetry} className="mt-2 underline underline-offset-4">
              Try again
            </button>
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-olive-900/15 bg-ivory/60 px-6 py-10 text-center">
            <MapPin aria-hidden="true" className="mx-auto h-6 w-6 text-olive-300" />
            <p className="mt-3 font-display text-[1.25rem] text-olive-900">No addresses yet</p>
            <p className="mt-1 text-[0.8125rem] text-olive-500">Add the first place dinner should find you.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                confirming={confirmDelete === address.id}
                isDeleting={deleteMutation.isPending && confirmDelete === address.id}
                isSettingDefault={defaultMutation.isPending}
                onEdit={() => {
                  setEditing(address);
                  setConfirmDelete(null);
                }}
                onSetDefault={() => defaultMutation.mutate(address.id)}
                onAskDelete={() => setConfirmDelete(address.id)}
                onCancelDelete={() => setConfirmDelete(null)}
                onDelete={() => deleteMutation.mutate(address.id)}
              />
            ))}
          </div>
        )}

        {defaultMutation.isError ? (
          <p className="mt-4 text-[0.8125rem] text-danger">{getErrorMessage(defaultMutation.error)}</p>
        ) : null}
        {deleteMutation.isError ? (
          <p className="mt-4 text-[0.8125rem] text-danger">{getErrorMessage(deleteMutation.error)}</p>
        ) : null}
      </SectionFrame>
    </section>
  );
}

function AddressForm({
  initial,
  onSubmit,
  isDefaultAvailable,
}: {
  initial?: Address;
  onSubmit: (values: AddressValues) => Promise<void>;
  isDefaultAvailable: boolean;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: initial?.label ?? 'Home',
      line1: initial?.line1 ?? '',
      line2: initial?.line2 ?? '',
      city: initial?.city ?? 'Brooklyn',
      state: initial?.state ?? 'NY',
      postalCode: initial?.postalCode ?? '',
      country: initial?.country ?? 'USA',
      instructions: initial?.instructions ?? '',
      isDefault: initial?.isDefault ?? isDefaultAvailable,
    },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormAlert message={formError} />

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Select
          label="Label"
          options={[
            { value: 'Home', label: 'Home' },
            { value: 'Work', label: 'Work' },
            { value: 'Other', label: 'Other' },
          ]}
          error={errors.label?.message}
          {...register('label')}
        />
        <Input
          label="Street address"
          autoComplete="address-line1"
          placeholder="34 South Portland Avenue"
          error={errors.line1?.message}
          {...register('line1')}
        />
      </div>

      <Input
        label="Apartment, suite, floor (optional)"
        autoComplete="address-line2"
        placeholder="Apt 4B"
        error={errors.line2?.message}
        {...register('line2')}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="City"
          autoComplete="address-level2"
          error={errors.city?.message}
          {...register('city')}
        />
        <Input
          label="State"
          autoComplete="address-level1"
          error={errors.state?.message}
          {...register('state')}
        />
        <Input
          label="Postal code"
          autoComplete="postal-code"
          error={errors.postalCode?.message}
          {...register('postalCode')}
        />
      </div>

      <Input
        label="Country"
        autoComplete="country-name"
        error={errors.country?.message}
        {...register('country')}
      />

      <Textarea
        label="Delivery instructions (optional)"
        placeholder="Buzzer 4B. Leave with the doorman if I do not answer."
        rows={2}
        error={errors.instructions?.message}
        {...register('instructions')}
      />

      <Checkbox
        label="Make this my default delivery address"
        description="Checkout will start here when you order next."
        {...register('isDefault')}
      />

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button type="submit" size="sm" isLoading={isSubmitting}>
          Save address
        </Button>
        <p className="text-[0.6875rem] text-olive-500">Demo address · stored for this session only.</p>
      </div>
    </form>
  );
}

function AddressCard({
  address,
  confirming,
  isDeleting,
  isSettingDefault,
  onEdit,
  onSetDefault,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  address: Address;
  confirming: boolean;
  isDeleting: boolean;
  isSettingDefault: boolean;
  onEdit: () => void;
  onSetDefault: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const Icon = address.label === 'Home' ? Home : address.label === 'Work' ? Briefcase : MapPin;

  return (
    <article
      className={cn(
        'flex flex-col rounded-2xl border bg-ivory/60 p-5 transition',
        address.isDefault ? 'border-olive-700/40 ring-1 ring-inset ring-olive-700/10' : 'border-olive-900/10',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cream text-olive-700 ring-1 ring-inset ring-olive-900/8">
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
          <span className="text-[0.8125rem] font-semibold text-olive-900">{address.label}</span>
        </div>
        {address.isDefault ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-olive-700 px-2.5 py-1 text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-cream">
            <Check aria-hidden="true" className="h-2.5 w-2.5" />
            Default
          </span>
        ) : null}
      </div>

      <address className="mt-4 not-italic text-[0.8125rem] leading-relaxed text-olive-600">
        <span className="block font-medium text-olive-800">{address.line1}</span>
        {address.line2 ? <span className="block">{address.line2}</span> : null}
        <span className="block">
          {address.city}, {address.state} {address.postalCode}
        </span>
        <span className="block text-olive-500">{address.country}</span>
      </address>

      {address.instructions ? (
        <p className="mt-3 rounded-lg bg-cream/80 px-3 py-2 text-[0.6875rem] leading-relaxed text-olive-500">
          {address.instructions}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-olive-900/8 pt-4">
        {confirming ? (
          <>
            <span className="mr-auto text-[0.75rem] font-medium text-danger">Delete this address?</span>
            <Button type="button" variant="danger" size="sm" isLoading={isDeleting} onClick={onDelete}>
              Delete
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancelDelete}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            {!address.isDefault ? (
              <button
                type="button"
                onClick={onSetDefault}
                disabled={isSettingDefault}
                className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-olive-600 transition hover:text-olive-900 disabled:opacity-50"
              >
                <Star aria-hidden="true" className="h-3.5 w-3.5" />
                Make default
              </button>
            ) : (
              <span className="text-[0.75rem] text-olive-500">Used at checkout</span>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="ml-auto inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-olive-600 transition hover:text-terracotta-600"
            >
              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={onAskDelete}
              aria-label={`Delete ${address.label} address`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-olive-500 transition hover:bg-danger/5 hover:text-danger"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
