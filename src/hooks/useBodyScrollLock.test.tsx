import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBodyScrollLock } from './useBodyScrollLock';

function Overlay({ locked }: { locked: boolean }) {
  useBodyScrollLock(locked);
  return null;
}

describe('useBodyScrollLock', () => {
  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('keeps scrolling locked until all overlays release the lock', () => {
    const first = render(<Overlay locked />);
    const second = render(<Overlay locked />);

    expect(document.body.style.overflow).toBe('hidden');

    first.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    second.unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
