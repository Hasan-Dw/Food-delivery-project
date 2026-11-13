import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/app/providers/AuthProvider';
import { queryKeys } from '@/lib/query-keys';
import { useImagePicker } from '@/hooks/useImagePicker';
import { services } from '@/services';
import { getErrorMessage } from '@/services/api/errors';
import { useToast } from '@/stores/toast-store';
import type { User } from '@/types';
import { cn } from '@/lib/cn';

interface ProfileImageUploaderProps {
  user: User;
  className?: string;
}

/** Own-profile avatar manager: preview, replace and remove. */
export function ProfileImageUploader({ user, className }: ProfileImageUploaderProps) {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();
  const notify = useToast();

  const applyUser = (next: User) => {
    updateUser(next);
    queryClient.setQueryData(queryKeys.profile, next);
  };

  const upload = useMutation({
    mutationFn: (file: File) => services.users.uploadProfileImage(file),
    onSuccess: (next) => {
      applyUser(next);
      notify({ tone: 'success', title: 'Photo updated', description: 'Your new profile photo is now live.' });
    },
    onError: (error) => {
      notify({ tone: 'error', title: 'Could not update your photo', description: getErrorMessage(error) });
    },
  });

  const remove = useMutation({
    mutationFn: () => services.users.removeProfileImage(),
    onSuccess: (next) => {
      applyUser(next);
      notify({ tone: 'success', title: 'Photo removed', description: 'Your initials are shown instead.' });
    },
    onError: (error) => {
      notify({ tone: 'error', title: 'Could not remove your photo', description: getErrorMessage(error) });
    },
  });

  const busy = upload.isPending || remove.isPending;
  const picker = useImagePicker({
    onSelect: (file) => upload.mutate(file),
    onInvalid: (message) => notify({ tone: 'error', title: 'That image cannot be used', description: message }),
  });

  return (
    <div className={cn('flex flex-col items-start gap-3', className)}>
      <div className="relative">
        <Avatar
          name={user.fullName}
          imageKey={user.avatarKey}
          size="xl"
          ring
          className="ring-offset-cream"
        />
        <button
          type="button"
          onClick={picker.open}
          disabled={busy}
          aria-label="Change profile photo"
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-olive-700 text-cream shadow-soft ring-2 ring-cream transition hover:bg-olive-800 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera aria-hidden="true" className="h-3.5 w-3.5" />
          )}
        </button>
        <input
          ref={picker.inputRef}
          type="file"
          accept={picker.accept}
          onChange={picker.handleChange}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={picker.open}
          disabled={busy}
          className="text-[0.75rem] font-medium text-olive-600 underline-offset-4 hover:underline disabled:opacity-60"
        >
          {user.avatarKey ? 'Replace photo' : 'Upload photo'}
        </button>
        {user.avatarKey ? (
          <button
            type="button"
            onClick={() => remove.mutate()}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[0.75rem] font-medium text-terracotta-600 underline-offset-4 hover:underline disabled:opacity-60"
          >
            <Trash2 aria-hidden="true" className="h-3 w-3" />
            Remove
          </button>
        ) : null}
      </div>
      <p className="text-[0.6875rem] text-olive-500">JPEG, PNG or WebP · up to 5 MB.</p>
    </div>
  );
}
