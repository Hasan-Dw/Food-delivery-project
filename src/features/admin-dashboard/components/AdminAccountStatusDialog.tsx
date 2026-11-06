import { useEffect, useState } from 'react';
import type { AccountStatus, User } from '@/types';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/features/dashboard/components/ConfirmDialog';
import { accountStatusLabel } from '@/features/dashboard/components/StatusBadge';
import { roleLabels } from '@/lib/permissions';

interface AdminAccountStatusDialogProps {
  open: boolean;
  account: User | null;
  nextStatus: AccountStatus | null;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
}

const actionCopy: Record<
  Exclude<AccountStatus, 'PENDING_APPROVAL'>,
  { title: string; confirmLabel: string; description: string; reasonRequired: boolean }
> = {
  APPROVED: {
    title: 'Approve this account?',
    confirmLabel: 'Approve account',
    description:
      'The account becomes active immediately. Restaurant owners and drivers can open their dashboards once other requirements are met.',
    reasonRequired: false,
  },
  REJECTED: {
    title: 'Reject this application?',
    confirmLabel: 'Reject application',
    description:
      'The applicant will see a rejected-application screen and cannot access an operational dashboard. Add a short internal reason.',
    reasonRequired: true,
  },
  SUSPENDED: {
    title: 'Suspend this account?',
    confirmLabel: 'Suspend account',
    description:
      'Access is blocked immediately. Suspending or rejecting a driver also releases any active delivery back to PENDING_ASSIGNMENT without closing the customer’s order.',
    reasonRequired: true,
  },
};

export function AdminAccountStatusDialog({
  open,
  account,
  nextStatus,
  isLoading = false,
  onCancel,
  onConfirm,
}: AdminAccountStatusDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setError(null);
  }, [open, account?.id, nextStatus]);

  if (!account || !nextStatus || nextStatus === 'PENDING_APPROVAL') return null;

  const copy = actionCopy[nextStatus];
  const isReactivating = nextStatus === 'APPROVED' && account.accountStatus !== 'PENDING_APPROVAL';

  return (
    <ConfirmDialog
      open={open}
      tone={nextStatus === 'APPROVED' ? 'primary' : 'danger'}
      title={
        isReactivating
          ? `Reactivate ${account.fullName}?`
          : nextStatus === 'APPROVED'
            ? `Approve ${account.fullName}?`
            : copy.title
      }
      description={`${roleLabels[account.role]} · currently ${accountStatusLabel(account.accountStatus)}. ${copy.description}`}
      confirmLabel={isReactivating ? 'Reactivate account' : copy.confirmLabel}
      isLoading={isLoading}
      onCancel={onCancel}
      onConfirm={() => {
        const trimmed = reason.trim();
        if (copy.reasonRequired && !trimmed) {
          setError('Add a short reason for the audit trail.');
          return;
        }
        onConfirm(trimmed || undefined);
      }}
    >
      <Textarea
        label={copy.reasonRequired ? 'Reason (required)' : 'Internal note (optional)'}
        rows={3}
        value={reason}
        error={error ?? undefined}
        placeholder={
          nextStatus === 'SUSPENDED'
            ? 'e.g. Repeated delivery policy breaches'
            : nextStatus === 'REJECTED'
              ? 'e.g. Incomplete driver documents'
              : 'Optional note for other administrators'
        }
        onChange={(event) => {
          setReason(event.target.value);
          if (error) setError(null);
        }}
      />
    </ConfirmDialog>
  );
}
