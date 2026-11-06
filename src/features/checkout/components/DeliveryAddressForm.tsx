import type { Address } from '@/types';

type AddressField = 'line1' | 'city' | 'state' | 'postalCode' | 'country';

export function DeliveryAddressForm({
  address,
  onChange,
  errors,
  disabled = false,
}: {
  address: Address;
  onChange: (address: Address) => void;
  errors: Partial<Record<AddressField, string>>;
  disabled?: boolean;
}) {
  const update = (field: keyof Address, value: string) => onChange({ ...address, [field]: value });
  const fields: Array<{ key: AddressField; label: string; autoComplete: string }> = [
    { key: 'line1', label: 'Street address', autoComplete: 'address-line1' },
    { key: 'city', label: 'City', autoComplete: 'address-level2' },
    { key: 'state', label: 'State', autoComplete: 'address-level1' },
    { key: 'postalCode', label: 'ZIP code', autoComplete: 'postal-code' },
    { key: 'country', label: 'Country', autoComplete: 'country-name' },
  ];

  return (
    <section className="rounded-2xl border border-olive-900/10 bg-white/70 p-5 shadow-soft sm:p-7">
      <div className="mb-5">
        <p className="eyebrow text-terracotta-700">01 · Where to?</p>
        <h2 className="mt-2 font-display text-[1.65rem] text-olive-900">Delivery address</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, autoComplete }) => (
          <label key={key} className={key === 'line1' ? 'sm:col-span-2' : ''}>
            <span className="mb-1.5 block text-xs font-medium text-olive-700">{label}</span>
            <input
              autoComplete={autoComplete}
              disabled={disabled}
              value={address[key]}
              onChange={(event) => update(key, event.target.value)}
              aria-invalid={Boolean(errors[key])}
              aria-describedby={errors[key] ? `address-${key}-error` : undefined}
              className="w-full rounded-xl border border-olive-900/15 bg-ivory/70 px-3.5 py-3 text-sm text-olive-900 outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 disabled:opacity-60"
            />
            {errors[key] ? (
              <span id={`address-${key}-error`} className="mt-1 block text-xs text-danger">
                {errors[key]}
              </span>
            ) : null}
          </label>
        ))}
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-olive-700">Delivery instructions</span>
          <textarea
            disabled={disabled}
            rows={2}
            value={address.instructions ?? ''}
            onChange={(event) => update('instructions', event.target.value)}
            placeholder="Apartment, buzzer, or a helpful note for your courier"
            className="w-full resize-y rounded-xl border border-olive-900/15 bg-ivory/70 px-3.5 py-3 text-sm text-olive-900 outline-none transition placeholder:text-olive-400 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 disabled:opacity-60"
          />
        </label>
      </div>
    </section>
  );
}
