import { useState } from 'react';
import { Camera, ImageOff, Loader2, MapPin, RefreshCw, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormAlert } from '@/components/ui/FormAlert';
import { Image } from '@/components/ui/Image';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { PageLoader } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanel';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { LocationPickerMap } from '@/features/location/components/LocationPickerMap';
import type { GeocodedPlace } from '@/features/location/geocoding';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api/errors';
import { useToast } from '@/stores/toast-store';
import type { Coordinates, Restaurant } from '@/types';
import {
  useRestaurantImageMutations,
  useRestaurantProfile,
  useRestaurantProfileMutations,
} from '../hooks/useRestaurantDashboard';

export default function RestaurantSettingsPage() {
  useDocumentTitle('Restaurant profile');
  const restaurant = useRestaurantProfile();

  if (restaurant.isLoading) return <PageLoader label="Loading restaurant settings…" />;

  if (restaurant.isError || !restaurant.data) {
    return (
      <ErrorState
        title="Restaurant settings could not be loaded"
        description="Your restaurant profile did not respond."
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => void restaurant.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Restaurant profile"
        title="Profile & location"
        description="Keep your public details and kitchen pin current, then manage the cover and logo customers see in discovery."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void restaurant.refetch()}
            isLoading={restaurant.isFetching}
            iconLeft={<RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      <ProfilePanel restaurant={restaurant.data} />
      <BrandImages restaurant={restaurant.data} />
    </div>
  );
}

interface ProfileFormState {
  name: string;
  tagline: string;
  description: string;
  deliveryFee: string;
  minOrder: string;
  isOpen: boolean;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

function toFormState(restaurant: Restaurant): ProfileFormState {
  return {
    name: restaurant.name,
    tagline: restaurant.tagline,
    description: restaurant.description ?? '',
    deliveryFee: String(restaurant.deliveryFee),
    minOrder: String(restaurant.minOrder),
    isOpen: restaurant.isOpen,
    line1: restaurant.address.line1,
    line2: restaurant.address.line2 ?? '',
    city: restaurant.address.city,
    state: restaurant.address.state,
    postalCode: restaurant.address.postalCode,
    country: restaurant.address.country,
  };
}

function ProfilePanel({ restaurant }: { restaurant: Restaurant }) {
  const mutations = useRestaurantProfileMutations();
  const notify = useToast();

  const [form, setForm] = useState<ProfileFormState>(() => toFormState(restaurant));
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    restaurant.address.coordinates ?? null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const update = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const applyGeocodedPlace = (place: GeocodedPlace | null) => {
    if (!place?.address) return;
    const parts = place.address;

    setForm((previous) => ({
      ...previous,
      line1: parts.line1 || previous.line1,
      city: parts.city || previous.city,
      state: parts.state || previous.state,
      postalCode: parts.postalCode || previous.postalCode,
      country: parts.country || previous.country,
    }));
  };

  const submit = async () => {
    setFormError(null);

    if (form.name.trim().length < 2) return setFormError('Enter the restaurant name.');
    if (form.line1.trim().length < 3) return setFormError('Enter the street address.');
    if (form.description.length > 1000) {
      return setFormError('Keep the description to 1,000 characters or fewer.');
    }
    if (!form.city.trim() || !form.state.trim() || !form.postalCode.trim()) {
      return setFormError('Enter the city, state and postal code.');
    }
    if (!coordinates) {
      return setFormError('Drop a pin on the map so deliveries can be routed to your kitchen.');
    }

    const deliveryFee = Number(form.deliveryFee);
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      return setFormError('Enter a valid delivery fee.');
    }

    const minOrder = Number(form.minOrder);
    if (!Number.isFinite(minOrder) || minOrder < 0) {
      return setFormError('Enter a valid minimum order.');
    }

    try {
      await mutations.update.mutateAsync({
        restaurantId: restaurant.id,
        input: {
          name: form.name.trim(),
          tagline: form.tagline.trim(),
          description: form.description.trim(),
          isOpen: form.isOpen,
          deliveryFee,
          minOrder,
          address: {
            line1: form.line1.trim(),
            line2: form.line2.trim() || undefined,
            city: form.city.trim(),
            state: form.state.trim(),
            postalCode: form.postalCode.trim(),
            country: form.country.trim(),
            coordinates,
          },
        },
      });
      notify({ tone: 'success', title: 'Restaurant profile saved' });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const saving = mutations.update.isPending;

  return (
    <DashboardPanel
      title="Profile & location"
      description="Customers see this name, tagline and description. The pin is the kitchen origin used for delivery routing and ETA."
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Restaurant name"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              maxLength={120}
              autoComplete="organization"
            />
            <Input
              label="Tagline"
              value={form.tagline}
              onChange={(event) => update('tagline', event.target.value)}
              maxLength={160}
              hint="One short line shown under your name."
            />
          </div>

          <Textarea
            label="Restaurant description"
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            rows={4}
            maxLength={1000}
            hint={`Optional. Shown on your restaurant page. ${1000 - form.description.length} characters remaining.`}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Delivery fee (USD)"
              value={form.deliveryFee}
              onChange={(event) => update('deliveryFee', event.target.value)}
              inputMode="decimal"
            />
            <Input
              label="Minimum order (USD)"
              value={form.minOrder}
              onChange={(event) => update('minOrder', event.target.value)}
              inputMode="decimal"
            />
          </div>

          <Checkbox
            label="Accepting orders"
            description="Turn this off to pause new orders without changing anything else."
            checked={form.isOpen}
            onChange={(event) => update('isOpen', event.target.checked)}
          />

          <div className="space-y-4 border-t border-olive-900/8 pt-4">
            <p className="text-[0.8125rem] font-medium text-olive-800">Kitchen address</p>

            <Input
              label="Street address"
              value={form.line1}
              onChange={(event) => update('line1', event.target.value)}
              maxLength={180}
              autoComplete="address-line1"
            />
            <Input
              label="Apartment, suite or unit (optional)"
              value={form.line2}
              onChange={(event) => update('line2', event.target.value)}
              maxLength={160}
              autoComplete="address-line2"
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="City"
                value={form.city}
                onChange={(event) => update('city', event.target.value)}
                maxLength={80}
                autoComplete="address-level2"
              />
              <Input
                label="State"
                value={form.state}
                onChange={(event) => update('state', event.target.value)}
                maxLength={80}
                autoComplete="address-level1"
              />
              <Input
                label="Postal code"
                value={form.postalCode}
                onChange={(event) => update('postalCode', event.target.value)}
                maxLength={20}
                autoComplete="postal-code"
              />
            </div>

            <Input
              label="Country"
              value={form.country}
              onChange={(event) => update('country', event.target.value)}
              maxLength={80}
              autoComplete="country-name"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-olive-800">
              <MapPin aria-hidden="true" className="h-4 w-4 text-terracotta-600" />
              Kitchen pin
            </span>
            <span className="text-[0.6875rem] text-olive-500">Saved with the profile</span>
          </div>

          <LocationPickerMap
            value={coordinates}
            onChange={setCoordinates}
            onResolveAddress={applyGeocodedPlace}
            center={restaurant.address.coordinates ?? undefined}
            heightClassName="h-72"
          />

          <p className="text-[0.6875rem] leading-relaxed text-olive-500">
            Click the map, drag the pin, search an address or use your current location. Coordinates
            are stored in MongoDB and used as the delivery origin.
          </p>

          <FormAlert message={formError} />

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="submit"
              size="sm"
              isLoading={saving}
              iconLeft={<Save aria-hidden="true" className="h-3.5 w-3.5" />}
            >
              Save changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => {
                setForm(toFormState(restaurant));
                setCoordinates(restaurant.address.coordinates ?? null);
                setFormError(null);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </form>
    </DashboardPanel>
  );
}

function BrandImages({ restaurant }: { restaurant: Restaurant }) {
  const mutations = useRestaurantImageMutations();
  const notify = useToast();

  const busy =
    mutations.uploadCover.isPending ||
    mutations.removeCover.isPending ||
    mutations.uploadLogo.isPending ||
    mutations.removeLogo.isPending;

  const coverPicker = useImagePicker({
    onSelect: (file) =>
      mutations.uploadCover.mutate(file, {
        onSuccess: () => notify({ tone: 'success', title: 'Cover image updated' }),
        onError: (error) =>
          notify({ tone: 'error', title: 'Could not upload the cover', description: getErrorMessage(error) }),
      }),
    onInvalid: (message) =>
      notify({ tone: 'error', title: 'That image cannot be used', description: message }),
  });

  const logoPicker = useImagePicker({
    onSelect: (file) =>
      mutations.uploadLogo.mutate(file, {
        onSuccess: () => notify({ tone: 'success', title: 'Logo updated' }),
        onError: (error) =>
          notify({ tone: 'error', title: 'Could not upload the logo', description: getErrorMessage(error) }),
      }),
    onInvalid: (message) =>
      notify({ tone: 'error', title: 'That image cannot be used', description: message }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,1fr)]">
      <DashboardPanel title="Cover image" description="Shown on restaurant cards and the discovery page.">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-olive-900/10 bg-ivory-200">
          {restaurant.imageKey ? (
            <Image imageKey={restaurant.imageKey} alt={`${restaurant.name} cover`} sizes="(min-width: 1024px) 55vw, 100vw" className="h-full w-full" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-olive-500">
              <ImageOff aria-hidden="true" className="h-7 w-7" />
              <span className="text-[0.75rem]">No cover uploaded yet</span>
            </div>
          )}
          <button
            type="button"
            onClick={coverPicker.open}
            disabled={busy}
            className="absolute inset-0 flex items-center justify-center bg-olive-900/50 text-cream opacity-0 transition hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-cream/95 px-4 py-2 text-[0.75rem] font-medium text-olive-800">
              {mutations.uploadCover.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera aria-hidden="true" className="h-4 w-4" />
              )}
              Replace cover
            </span>
          </button>
          <input
            ref={coverPicker.inputRef}
            type="file"
            accept={coverPicker.accept}
            onChange={coverPicker.handleChange}
            className="sr-only"
            tabIndex={-1}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={coverPicker.open}
            disabled={busy}
            iconLeft={<Camera aria-hidden="true" className="h-3.5 w-3.5" />}
          >
            Upload cover
          </Button>
          {restaurant.imageKey ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                mutations.removeCover.mutate(undefined, {
                  onSuccess: () => notify({ tone: 'success', title: 'Cover removed' }),
                  onError: (error) =>
                    notify({
                      tone: 'error',
                      title: 'Could not remove the cover',
                      description: getErrorMessage(error),
                    }),
                })
              }
              iconLeft={<Trash2 aria-hidden="true" className="h-3.5 w-3.5" />}
              className="text-terracotta-600 hover:bg-terracotta-50"
            >
              Remove
            </Button>
          ) : null}
        </div>
        <p className="mt-3 text-[0.6875rem] text-olive-500">JPEG, PNG or WebP · up to 5 MB. Removing falls back to the default artwork.</p>
      </DashboardPanel>

      <DashboardPanel title="Logo" description="A compact mark used where space is tight.">
        <div className="flex items-center gap-5">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-olive-900/10 bg-ivory-200">
            {restaurant.logoKey ? (
              <Image imageKey={restaurant.logoKey} alt={`${restaurant.name} logo`} sizes="96px" className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-olive-400">
                <ImageOff aria-hidden="true" className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[0.8125rem] font-medium text-olive-800">{restaurant.name}</p>
            <p className="mt-0.5 text-[0.6875rem] text-olive-500">
              {restaurant.logoKey ? 'Custom logo in use' : 'Default mark in use'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={logoPicker.open}
                disabled={busy}
                iconLeft={<Camera aria-hidden="true" className="h-3.5 w-3.5" />}
              >
                {restaurant.logoKey ? 'Replace' : 'Upload'}
              </Button>
              {restaurant.logoKey ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    mutations.removeLogo.mutate(undefined, {
                      onSuccess: () => notify({ tone: 'success', title: 'Logo removed' }),
                      onError: (error) =>
                        notify({
                          tone: 'error',
                          title: 'Could not remove the logo',
                          description: getErrorMessage(error),
                        }),
                    })
                  }
                  iconLeft={<Trash2 aria-hidden="true" className="h-3.5 w-3.5" />}
                  className="text-terracotta-600 hover:bg-terracotta-50"
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
          <input
            ref={logoPicker.inputRef}
            type="file"
            accept={logoPicker.accept}
            onChange={logoPicker.handleChange}
            className="sr-only"
            tabIndex={-1}
          />
        </div>
        <p className="mt-4 text-[0.6875rem] text-olive-500">Square images work best. JPEG, PNG or WebP · up to 5 MB.</p>
      </DashboardPanel>
    </div>
  );
}
