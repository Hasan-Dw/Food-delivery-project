import { useEffect, type RefObject } from 'react';

/** Closes popovers on outside pointer-down and Escape. */
export function useDismissible(
  open: boolean,
  onClose: () => void,
  ref: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && ref.current && !ref.current.contains(target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open, onClose, ref]);
}
