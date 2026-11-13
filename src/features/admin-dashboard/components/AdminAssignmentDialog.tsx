import { useEffect, useState } from 'react';
import type { Delivery, DeliveryAssignmentAction, Driver, Order } from '@/types';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/features/dashboard/components/ConfirmDialog';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { canAssignDelivery, driverAssignmentBlockReason } from '@/lib/permissions';
import { serviceAreasCompatible } from '@/lib/driver-assignment';

interface AdminAssignmentDialogProps {
  open: boolean;
  mode: DeliveryAssignmentAction | null;
  delivery: Delivery | null;
  order?: Order;
  currentDriver?: Driver;
  /** Restaurant city used for the coarse service-area pre-check. */
  restaurantCity?: string;
  drivers: Driver[];
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: (input: { driverId?: string; reason: string }) => void;
}

const copy: Record<
  DeliveryAssignmentAction,
  { title: string; confirmLabel: string; description: string; tone: 'primary' | 'danger' }
> = {
  ASSIGN: {
    title: 'Assign a driver',
    confirmLabel: 'Assign driver',
    description:
      'Only approved, available drivers without an active delivery can be assigned. The customer’s order is not changed.',
    tone: 'primary',
  },
  UNASSIGN: {
    title: 'Unassign this delivery?',
    confirmLabel: 'Unassign delivery',
    description:
      'The driver is released and the delivery returns to PENDING_ASSIGNMENT. The customer’s order stays active; this is not a cancellation.',
    tone: 'danger',
  },
  REASSIGN: {
    title: 'Reassign this delivery?',
    confirmLabel: 'Reassign delivery',
    description:
      'The current driver is released and another eligible driver is assigned. Reassignment is only allowed before the food is picked up.',
    tone: 'danger',
  },
};

export function AdminAssignmentDialog({
  open,
  mode,
  delivery,
  order,
  currentDriver,
  restaurantCity,
  drivers,
  isLoading = false,
  onCancel,
  onConfirm,
}: AdminAssignmentDialogProps) {
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedDriverId('');
    setReason('');
    setError(null);
  }, [open, delivery?.id, mode]);

  if (!delivery || !mode) return null;

  const inTransit = delivery.status === 'PICKED_UP' || delivery.status === 'ON_THE_WAY';

  const eligibleDrivers = drivers.filter(
    (driver) =>
      driver.id !== delivery.driverId &&
      canAssignDelivery(driver) &&
      serviceAreasCompatible(driver.serviceArea, restaurantCity),
  );
  const blockedDrivers = drivers.filter(
    (driver) =>
      driver.id !== delivery.driverId &&
      driver.accountStatus === 'APPROVED' &&
      !eligibleDrivers.some((eligible) => eligible.id === driver.id),
  );
  const needsDriver = mode !== 'UNASSIGN';
  const needsReason = mode !== 'ASSIGN';
  const orderClosed =
    order?.status === 'CANCELLED' || order?.status === 'REJECTED' || order?.status === 'COMPLETED';

  const blockReason = (driver: Driver): string => {
    if (!canAssignDelivery(driver)) return driverAssignmentBlockReason(driver) ?? 'Unavailable';
    if (!serviceAreasCompatible(driver.serviceArea, restaurantCity)) {
      return `Outside the delivery service area${restaurantCity ? ` (${restaurantCity})` : ''}`;
    }
    return 'Unavailable';
  };

  const submit = () => {
    if (inTransit) {
      setError(
        'This delivery is already in transit. Use the exceptional handover workflow instead of normal reassignment.',
      );
      return;
    }
    if (orderClosed) {
      setError('This order is already closed and cannot receive a driver.');
      return;
    }
    if (needsDriver && !selectedDriverId) {
      setError('Choose a driver first.');
      return;
    }
    if (needsReason && !reason.trim()) {
      setError('Add a short reason so the assignment history explains the change.');
      return;
    }
    onConfirm({ driverId: selectedDriverId || undefined, reason: reason.trim() });
  };

  return (
    <ConfirmDialog
      open={open}
      tone={copy[mode].tone}
      title={`${copy[mode].title}${order?.code ? ` · ${order.code}` : ''}`}
      description={copy[mode].description}
      confirmLabel={copy[mode].confirmLabel}
      isLoading={isLoading}
      onCancel={onCancel}
      onConfirm={submit}
    >
      <div className="space-y-4">
        {inTransit ? (
          <div className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-3 text-[0.75rem] leading-relaxed text-danger">
            <p className="font-semibold">Exceptional handover required</p>
            <p className="mt-1">
              The food is already in the driver’s custody. Normal unassign/reassign is blocked so the
              order is never stranded. A dedicated handover model is not implemented in this build.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-olive-900/10 bg-ivory-50/60 px-3.5 py-3">
          <div>
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-500">Delivery</p>
            <p className="mt-0.5 text-[0.8125rem] font-medium text-olive-900">{delivery.id}</p>
            {restaurantCity ? (
              <p className="mt-0.5 text-[0.6875rem] text-olive-500">Service area · {restaurantCity}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {order ? <StatusBadge status={order.status} /> : null}
            <StatusBadge status={delivery.status} />
          </div>
        </div>

        {mode !== 'UNASSIGN' ? (
          <Select
            label="Driver"
            value={selectedDriverId}
            disabled={inTransit}
            error={error && needsDriver && !selectedDriverId ? error : undefined}
            onChange={(event) => {
              setSelectedDriverId(event.target.value);
              if (error) setError(null);
            }}
            options={[
              { value: '', label: eligibleDrivers.length ? 'Select an eligible driver' : 'No eligible drivers' },
              ...eligibleDrivers.map((driver) => ({
                value: driver.id,
                label: `${driver.name} · ${driver.vehicle}${driver.serviceArea ? ` · ${driver.serviceArea}` : ''}`,
              })),
            ]}
          />
        ) : null}

        {mode === 'UNASSIGN' && currentDriver ? (
          <div className="rounded-xl border border-olive-900/10 bg-cream px-3.5 py-3 text-[0.75rem] leading-relaxed text-olive-600">
            <p>
              <span className="font-medium text-olive-900">{currentDriver.name}</span> will be released
              and returned to AVAILABLE when no other active delivery is held.
            </p>
            <p className="mt-1">
              The delivery returns to PENDING_ASSIGNMENT and Savora attempts an automatic replacement
              (excluding {currentDriver.name}). The customer’s order is <strong>not</strong> cancelled.
            </p>
          </div>
        ) : null}

        <Textarea
          label={needsReason ? 'Reason (required)' : 'Internal note (optional)'}
          rows={3}
          value={reason}
          error={error && needsReason && !reason.trim() ? error : undefined}
          placeholder={
            mode === 'REASSIGN'
              ? 'e.g. Original driver reported a vehicle issue'
              : mode === 'UNASSIGN'
                ? 'e.g. Driver reported a breakdown'
                : 'Optional note for the assignment history'
          }
          onChange={(event) => {
            setReason(event.target.value);
            if (error) setError(null);
          }}
        />

        {orderClosed || (error && !needsDriver && !needsReason) ? (
          <p className="text-[0.75rem] text-danger">{error}</p>
        ) : null}

        {eligibleDrivers.length === 0 && mode !== 'UNASSIGN' ? (
          <p className="text-[0.6875rem] leading-relaxed text-olive-500">
            No approved, available driver currently has capacity. Approve or release a driver, then try again.
          </p>
        ) : null}

        {blockedDrivers.length && mode !== 'UNASSIGN' ? (
          <details className="rounded-xl border border-olive-900/10 bg-cream px-3.5 py-3 text-[0.6875rem] text-olive-500">
            <summary className="cursor-pointer font-medium text-olive-700">
              {blockedDrivers.length} unavailable {blockedDrivers.length === 1 ? 'driver' : 'drivers'}
            </summary>
            <ul className="mt-2 space-y-1">
              {blockedDrivers.map((driver) => (
                <li key={driver.id}>
                  {driver.name} — {blockReason(driver)}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}
