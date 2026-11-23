import { useState } from 'react';
import { Pencil, Plus, RefreshCw, Tag, Trash2, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Image } from '@/components/ui/Image';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { ConfirmDialog } from '@/features/dashboard/components/ConfirmDialog';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { categoryImageKeys } from '@/config/categories';
import { getErrorMessage } from '@/services/api/errors';
import { useToast } from '@/stores/toast-store';
import type { RestaurantCategory } from '@/types';
import type { RestaurantCategoryInput } from '@/services/restaurants/RestaurantService';
import {
  useAdminRestaurantCategories,
  useCreateRestaurantCategory,
  useDeleteRestaurantCategory,
  useUpdateRestaurantCategory,
} from '../hooks/useAdminDashboard';

export default function AdminCategoriesPage() {
  useDocumentTitle('Restaurant categories');

  const categories = useAdminRestaurantCategories();
  const create = useCreateRestaurantCategory();
  const update = useUpdateRestaurantCategory();
  const remove = useDeleteRestaurantCategory();
  const notify = useToast();

  const [editor, setEditor] = useState<
    { mode: 'create' } | { mode: 'edit'; category: RestaurantCategory } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<RestaurantCategory | null>(null);

  const rows = categories.data ?? [];
  const assigned = rows.filter((category) => category.itemCount > 0).length;
  const unassigned = rows.length - assigned;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Discovery catalog"
        title="Restaurant categories"
        description="Manage the cuisine categories customers browse and owners assign to their restaurant. Categories still in use cannot be deleted."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void categories.refetch()}
              isLoading={categories.isFetching}
              iconLeft={<RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setEditor({ mode: 'create' })}
              iconLeft={<Plus aria-hidden="true" className="h-3.5 w-3.5" />}
            >
              Add category
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Categories"
          value={String(rows.length)}
          icon={<Tag aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard
          label="In use"
          value={String(assigned)}
          icon={<UtensilsCrossed aria-hidden="true" className="h-4 w-4" />}
          hint="Assigned to at least one approved restaurant"
        />
        <StatCard label="Unassigned" value={String(unassigned)} />
      </div>

      {categories.isLoading ? (
        <PageLoader label="Loading restaurant categories…" />
      ) : categories.isError ? (
        <ErrorState
          title="Categories could not be loaded"
          description={getErrorMessage(categories.error)}
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void categories.refetch()}>
              Try again
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-6 w-6" />}
          title="No categories yet"
          description="Add the first category so customers can browse restaurants and owners can tag their profile."
          action={
            <Button type="button" size="sm" onClick={() => setEditor({ mode: 'create' })}>
              Add category
            </Button>
          }
        />
      ) : (
        <DashboardPanel bodyClassName="px-0 py-0">
          <div className="divide-y divide-olive-900/8">
            {rows.map((category) => (
              <div
                key={category.id}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-olive-900/10 bg-ivory-200">
                  <Image
                    imageKey={category.imageKey}
                    alt={category.name}
                    sizes="80px"
                    className="h-full w-full"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-olive-900">{category.name}</p>
                    <span className="rounded-full bg-olive-900/5 px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.08em] text-olive-500">
                      {category.slug}
                    </span>
                    {category.sortOrder !== undefined ? (
                      <span className="text-[0.625rem] text-olive-400">
                        Order {category.sortOrder}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 max-w-xl truncate text-[0.75rem] text-olive-500">
                    {category.description || 'No description yet.'}
                  </p>
                  <p className="mt-1 text-[0.6875rem] text-olive-500">
                    {category.itemCount} approved restaurant
                    {category.itemCount === 1 ? '' : 's'} · {category.itemCount > 0 ? 'in use' : 'unassigned'}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditor({ mode: 'edit', category })}
                    iconLeft={<Pencil aria-hidden="true" className="h-3.5 w-3.5" />}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(category)}
                    iconLeft={<Trash2 aria-hidden="true" className="h-3.5 w-3.5" />}
                    className="text-terracotta-600 hover:bg-terracotta-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>
      )}

      {editor ? (
        <CategoryEditor
          mode={editor.mode}
          category={editor.mode === 'edit' ? editor.category : undefined}
          isSaving={create.isPending || update.isPending}
          onClose={() => setEditor(null)}
          onSave={(input) => {
            const done = () => {
              setEditor(null);
              notify({
                tone: 'success',
                title:
                  editor.mode === 'create'
                    ? 'Restaurant category added'
                    : 'Restaurant category updated',
              });
            };
            const fail = (error: unknown) =>
              notify({
                tone: 'error',
                title: 'Could not save the category',
                description: getErrorMessage(error),
              });

            if (editor.mode === 'create') {
              create.mutate(input, { onSuccess: done, onError: fail });
            } else {
              update.mutate(
                { categoryId: editor.category.id, input },
                { onSuccess: done, onError: fail },
              );
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name ?? 'this category'}?`}
        description={
          deleteTarget && deleteTarget.itemCount > 0
            ? 'This category is still assigned to restaurants. Remove it from every restaurant profile before deleting it.'
            : 'Customers will no longer see this category in discovery. This cannot be undone.'
        }
        confirmLabel="Delete category"
        tone="danger"
        isLoading={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          remove.mutate(deleteTarget.id, {
            onSuccess: () => {
              notify({ tone: 'success', title: 'Restaurant category deleted' });
              setDeleteTarget(null);
            },
            onError: (error) => {
              notify({
                tone: 'error',
                title: 'Could not delete the category',
                description: getErrorMessage(error),
              });
            },
          });
        }}
      />
    </div>
  );
}

interface CategoryEditorProps {
  mode: 'create' | 'edit';
  category?: RestaurantCategory;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: RestaurantCategoryInput) => void;
}

function CategoryEditor({ mode, category, isSaving, onClose, onSave }: CategoryEditorProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [imageKey, setImageKey] = useState(category?.imageKey ?? categoryImageKeys[0]);
  const [description, setDescription] = useState(category?.description ?? '');
  const [sortOrder, setSortOrder] = useState(
    category?.sortOrder !== undefined ? String(category.sortOrder) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (name.trim().length < 2) return setError('Add a category name.');
    const order = sortOrder.trim() === '' ? undefined : Number(sortOrder);
    if (order !== undefined && (!Number.isInteger(order) || order < 0)) {
      return setError('Sort order must be a whole number of zero or more.');
    }

    setError(null);
    onSave({
      name: name.trim(),
      imageKey,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(order !== undefined ? { sortOrder: order } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-olive-950/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-category-editor-title"
        className="w-full max-w-lg rounded-panel border border-olive-900/10 bg-cream p-6 shadow-lift"
      >
        <h2 id="admin-category-editor-title" className="text-[1.25rem] text-olive-900">
          {mode === 'create' ? 'Add a restaurant category' : 'Edit restaurant category'}
        </h2>
        <p className="mt-1 text-[0.75rem] text-olive-500">
          The URL slug is generated once and stays stable so restaurant links keep working.
        </p>

        <div className="mt-5 space-y-3.5">
          <label className="block">
            <span className="text-[0.75rem] font-medium text-olive-700">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-olive-900/15 bg-ivory px-3 py-2 text-[0.8125rem] text-olive-900 outline-none focus:border-olive-500"
              maxLength={60}
            />
          </label>

          <label className="block">
            <span className="text-[0.75rem] font-medium text-olive-700">Image</span>
            <select
              value={imageKey}
              onChange={(event) => setImageKey(event.target.value)}
              className="mt-1 w-full rounded-xl border border-olive-900/15 bg-ivory px-3 py-2 text-[0.8125rem] text-olive-900 outline-none focus:border-olive-500"
            >
              {categoryImageKeys.map((key) => (
                <option key={key} value={key}>
                  {key.replace('category-', '').replace(/-/g, ' ')}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[0.75rem] font-medium text-olive-700">
              Description (optional)
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 w-full rounded-xl border border-olive-900/15 bg-ivory px-3 py-2 text-[0.8125rem] text-olive-900 outline-none focus:border-olive-500"
              rows={2}
              maxLength={240}
            />
          </label>

          <label className="block">
            <span className="text-[0.75rem] font-medium text-olive-700">
              Sort order (optional)
            </span>
            <input
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-olive-900/15 bg-ivory px-3 py-2 text-[0.8125rem] text-olive-900 outline-none focus:border-olive-500"
            />
          </label>

          {error ? <p className="text-[0.75rem] text-danger">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={submit} isLoading={isSaving}>
            {mode === 'create' ? 'Add category' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
