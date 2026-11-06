import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  Bike,
  Check,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
  User,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { DemoAccountNotice } from '@/features/auth/components/DemoAccountNotice';
import { FormAlert } from '@/components/ui/FormAlert';
import {
  getPasswordStrength,
  registerSchema,
  type RegisterValues,
} from '@/lib/validation';
import { roleLandingPath } from '@/lib/permissions';
import { getErrorMessage } from '@/services/api/errors';
import { ROUTES } from '@/config/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/cn';
import type { RegisterPayload, RegistrationRole, VehicleType } from '@/types';

interface LocationState {
  from?: string;
}

const roleCards: Array<{
  role: RegistrationRole;
  title: string;
  description: string;
  icon: typeof ShoppingBag;
  approval: string;
}> = [
  {
    role: 'CUSTOMER',
    title: 'Customer',
    description: 'Browse kitchens, order food and follow delivery to your door.',
    icon: ShoppingBag,
    approval: 'Ready immediately',
  },
  {
    role: 'RESTAURANT_OWNER',
    title: 'Restaurant owner',
    description: 'Manage incoming orders and prepare food for Savora diners.',
    icon: Store,
    approval: 'Admin approval required',
  },
  {
    role: 'DRIVER',
    title: 'Delivery partner',
    description: 'Deliver orders across the city using your bike, scooter or car.',
    icon: Bike,
    approval: 'Admin approval required',
  },
];

const vehicleOptions = [
  { value: 'bike', label: 'Bicycle' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'car', label: 'Car' },
];

export default function RegisterPage() {
  useDocumentTitle('Create an account');
  const { signUp, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const from = state?.from?.startsWith('/') ? state.from : user ? roleLandingPath(user.role) : ROUTES.profile;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'CUSTOMER',
      restaurantName: '',
      restaurantAddress: '',
      restaurantPhone: '',
      restaurantDescription: '',
      driverPhone: '',
      driverServiceArea: '',
      driverVehicle: 'bike',
    },
  });

  const password = watch('password');
  const role = watch('role');
  const strength = getPasswordStrength(password);
  const isOwner = role === 'RESTAURANT_OWNER';
  const isDriver = role === 'DRIVER';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const selectRole = (nextRole: RegistrationRole) => {
    setValue('role', nextRole, { shouldValidate: false });
    clearErrors(['restaurantName', 'restaurantAddress', 'restaurantPhone', 'driverPhone', 'driverServiceArea', 'driverVehicle']);
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const payload: RegisterPayload = {
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: values.role,
      };

      if (values.role === 'RESTAURANT_OWNER') {
        payload.restaurant = {
          name: values.restaurantName ?? '',
          address: values.restaurantAddress ?? '',
          phone: values.restaurantPhone ?? '',
          description: values.restaurantDescription,
        };
        payload.phone = values.restaurantPhone;
      }

      if (values.role === 'DRIVER') {
        payload.driver = {
          phone: values.driverPhone ?? '',
          serviceArea: values.driverServiceArea ?? '',
          vehicle: (values.driverVehicle ?? 'bike') as VehicleType,
        };
        payload.phone = values.driverPhone;
      }

      await signUp(payload);
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
        Choose how you want to use Savora. Customer accounts are ready immediately; owner and driver accounts are
        reviewed by platform operations before dashboard access is granted.
      </p>

      <DemoAccountNotice variant="register" className="mt-6" />

      <fieldset className="mt-7">
        <legend className="text-[0.8125rem] font-medium text-olive-800">Account type</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {roleCards.map(({ role: cardRole, title, description, icon: Icon, approval }) => {
            const selected = role === cardRole;
            return (
              <button
                key={cardRole}
                type="button"
                aria-pressed={selected}
                onClick={() => selectRole(cardRole)}
                className={cn(
                  'group flex h-full flex-col rounded-2xl border p-4 text-left transition duration-300 ease-out-soft',
                  selected
                    ? 'border-olive-700 bg-olive-700 text-cream shadow-soft'
                    : 'border-olive-900/12 bg-cream text-olive-800 hover:border-olive-900/25 hover:shadow-soft',
                )}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    selected ? 'bg-cream/12 text-gold-200' : 'bg-olive-700/8 text-olive-700',
                  )}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="mt-3 text-[0.875rem] font-semibold">{title}</span>
                <span className={cn('mt-1 text-[0.6875rem] leading-relaxed', selected ? 'text-cream/70' : 'text-olive-500')}>
                  {description}
                </span>
                <span
                  className={cn(
                    'mt-3 inline-flex items-center gap-1 text-[0.625rem] font-medium uppercase tracking-[0.08em]',
                    selected ? 'text-gold-200' : cardRole === 'CUSTOMER' ? 'text-success' : 'text-terracotta-600',
                  )}
                >
                  <Check aria-hidden="true" className="h-3 w-3" />
                  {approval}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {isOwner || isDriver ? (
        <div className="mt-4 rounded-2xl border border-gold-300/50 bg-gold-50/70 px-4 py-3 text-[0.75rem] leading-relaxed text-olive-600">
          <span className="font-semibold text-olive-800">Approval required.</span>{' '}
          {isOwner
            ? 'Your restaurant account will be reviewed by Savora operations. You can sign in while pending, but the dashboard stays locked until approval.'
            : 'Your driver application will be reviewed by Savora operations. You cannot go online or receive deliveries until approved.'}
        </div>
      ) : null}

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

        {isOwner ? (
          <div className="space-y-5 rounded-2xl border border-olive-900/10 bg-cream/70 p-4 sm:p-5">
            <div>
              <p className="text-[0.8125rem] font-semibold text-olive-800">Restaurant details</p>
              <p className="mt-1 text-[0.6875rem] leading-relaxed text-olive-500">
                This creates a pending restaurant profile. Menus and opening hours can be completed after approval.
              </p>
            </div>

            <Input
              label="Restaurant name"
              placeholder="Kōji Sushi"
              leading={<Store aria-hidden="true" className="h-4 w-4" />}
              error={errors.restaurantName?.message}
              {...register('restaurantName')}
            />

            <Input
              label="Restaurant address"
              placeholder="31 Grand Street, Brooklyn, NY"
              leading={<MapPin aria-hidden="true" className="h-4 w-4" />}
              error={errors.restaurantAddress?.message}
              {...register('restaurantAddress')}
            />

            <Input
              label="Contact number"
              type="tel"
              autoComplete="tel"
              placeholder="+1 (718) 555-0100"
              leading={<Phone aria-hidden="true" className="h-4 w-4" />}
              error={errors.restaurantPhone?.message}
              {...register('restaurantPhone')}
            />

            <Textarea
              label="Restaurant description (optional)"
              rows={3}
              placeholder="What should diners know about your kitchen?"
              error={errors.restaurantDescription?.message}
              {...register('restaurantDescription')}
            />
          </div>
        ) : null}

        {isDriver ? (
          <div className="space-y-5 rounded-2xl border border-olive-900/10 bg-cream/70 p-4 sm:p-5">
            <div>
              <p className="text-[0.8125rem] font-semibold text-olive-800">Driver details</p>
              <p className="mt-1 text-[0.6875rem] leading-relaxed text-olive-500">
                Drivers belong to the Savora platform and can deliver for any restaurant once approved.
              </p>
            </div>

            <Input
              label="Phone number"
              type="tel"
              autoComplete="tel"
              placeholder="+1 (917) 555-0164"
              leading={<Phone aria-hidden="true" className="h-4 w-4" />}
              error={errors.driverPhone?.message}
              {...register('driverPhone')}
            />

            <Input
              label="Service area"
              placeholder="Brooklyn · North"
              leading={<MapPin aria-hidden="true" className="h-4 w-4" />}
              error={errors.driverServiceArea?.message}
              {...register('driverServiceArea')}
            />

            <Select
              label="Vehicle type"
              options={vehicleOptions}
              error={errors.driverVehicle?.message}
              {...register('driverVehicle')}
            />
          </div>
        ) : null}

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
          {isOwner ? 'Apply as restaurant owner' : isDriver ? 'Apply as driver' : 'Create account'}
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
        browser tab and are cleared when it closes. The selected role is a request, never an authorization claim.
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
