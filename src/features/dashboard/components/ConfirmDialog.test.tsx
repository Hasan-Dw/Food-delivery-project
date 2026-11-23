import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog pending action guard', () => {
  it('does not allow duplicate confirmation while the mutation is pending', () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Approve account"
        confirmLabel="Approve"
        isLoading
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
