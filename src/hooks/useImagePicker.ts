import { useRef, useState, type ChangeEvent } from 'react';
import { ACCEPTED_IMAGE_TYPES, validateImageFile } from '@/lib/image-upload';

export interface ImagePickerOptions {
  accept?: string;
  onSelect: (file: File) => void;
  onInvalid?: (message: string) => void;
}

/**
 * Headless file picker for image uploads. It enforces the same MIME and size
 * rules as the API and resets the input so re-selecting the same file works.
 */
export function useImagePicker({ accept = ACCEPTED_IMAGE_TYPES.join(','), onSelect, onInvalid }: ImagePickerOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const open = () => inputRef.current?.click();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const result = validateImageFile(file);
    if (!result.ok) {
      setError(result.error ?? 'That image cannot be uploaded.');
      onInvalid?.(result.error ?? 'That image cannot be uploaded.');
      return;
    }

    setError(null);
    onSelect(file);
  };

  return { inputRef, open, handleChange, error, accept, clearError: () => setError(null) };
}
