import { useMemo, useState } from 'react';
import {
  ImageOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Image } from '@/components/ui/Image';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { ConfirmDialog } from '@/features/dashboard/components/ConfirmDialog';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/services/api/errors';
import { useToast } from '@/stores/toast-store';
import type { Product, ProductCategory } from '@/types';
import type { ProductInput } from '@/services/products/ProductService';
import {
  useMenuItemMutations,
  useMenuCategories,
  useRestaurantMenu,
} from '../hooks/useRestaurantDashboard';

export default function RestaurantMenuPage() {
  useDocumentTitle('Menu management');
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const menu = useRestaurantMenu(restaurantId);
  const categories = useMenuCategories(restaurantId);
  const mutations = useMenuItemMutations(restaurantId);
  const notify = useToast();

  const [editor, setEditor] = useState<{ mode: 'create' } | { mode: 'edit'; item: Product } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const categoryNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories.data ?? []) map.set(category.id, category.name);
    return map;
  }, [categories.data]);

  if (!restaurantId) {
    return (
      <EmptyState
        icon={<ImageOff className="h-6 w-6" />}
        title="No restaurant linked"
        description="This account is not linked to a restaurant yet. Contact platform operations."
      />
    );
  }

  if (menu.isLoading) return <PageLoader label="Loading your menu…" />;

  if (menu.isError) {
    return (
      <ErrorState
        title="Menu could not be loaded"
        description="The menu service did not respond."
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => void menu.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const items = menu.data ?? [];

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Your kitchen"
        title="Menu management"
        description="Add dishes, keep prices current, manage availability and give every item a real photo."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void menu.refetch()}
              isLoading={menu.isFetching}
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
              Add dish
            </Button>
          </div>
        }
      />

      <DashboardPanel bodyClassName="px-0 py-0">
        {items.length ? (
          <div className="divide-y divide-olive-900/8">
            {items.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                categoryName={categoryNames.get(item.categoryId) ?? 'Uncategorised'}
                mutations={mutations}
                onEdit={() => setEditor({ mode: 'edit', item })}
                onDelete={() => setDeleteTarget(item)}
                notify={notify}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ImageOff className="h-6 w-6" />}
            title="No dishes yet"
            description="Add your first dish to start building the menu."
            className="border-0 bg-transparent"
            action={
              <Button type="button" size="sm" onClick={() => setEditor({ mode: 'create' })}>
                Add dish
              </Button>
            }
          />
        )}
      </DashboardPanel>

      {editor ? (
        <MenuItemEditor
          mode={editor.mode}
          item={editor.mode === 'edit' ? editor.item : undefined}
          categories={categories.data ?? []}
          isSaving={mutations.create.isPending || mutations.update.isPending}
          onClose={() => setEditor(null)}
          onSave={(input) => {
            const done = () => {
              setEditor(null);
              notify({ tone: 'success', title: editor.mode === 'create' ? 'Dish added' : 'Dish updated' });
            };
            const fail = (error: unknown) =>
              notify({ tone: 'error', title: 'Could not save the dish', description: getErrorMessage(error) });

            if (editor.mode === 'create') {
              mutations.create.mutate(input, { onSuccess: done, onError: fail });
            } else {
              mutations.update.mutate(
                { productId: editor.item.id, input },
                { onSuccess: done, onError: fail },
              );
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name ?? 'this dish'}?`}
        description="The dish is removed from the menu and its image is deleted. Past orders keep their snapshot."
        confirmLabel="Delete dish"
        tone="danger"
        isLoading={mutations.remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          mutations.remove.mutate(deleteTarget.id, {
            onSuccess: () => {
              notify({ tone: 'success', title: 'Dish deleted' });
              setDeleteTarget(null);
            },
            onError: (error) => {
              notify({ tone: 'error', title: 'Could not delete the dish', description: getErrorMessage(error) });
            },
          });
        }}
      />
    </div>
  );
}

type MenuMutations = ReturnType<typeof useMenuItemMutations>;

interface MenuItemRowProps {
  item: Product;
  categoryName: string;
  mutations: MenuMutations;
  onEdit: () => void;
  onDelete: () => void;
  notify: ReturnType<typeof useToast>;
}

function MenuItemRow({ item, categoryName, mutations, onEdit, onDelete, notify }: MenuItemRowProps) {
  const picker = useImagePicker({
    onSelect: (file) =>
      mutations.uploadImage.mutate(
        { productId: item.id, file },
        {
          onSuccess: () => notify({ tone: 'success', title: 'Photo updated', description: item.name }),
          onError: (error) =>
            notify({ tone: 'error', title: 'Could not upload the photo', description: getErrorMessage(error) }),
        },
      ),
    onInvalid: (message) =>
      notify({ tone: 'error', title: 'That image cannot be used', description: message }),
  });

  const busyImage = mutations.uploadImage.isPending || mutations.removeImage.isPending;

  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-olive-900/10 bg-ivory-200">
        <Image imageKey={item.imageKey} alt={item.name} sizes="80px" className="h-full w-full" />
        <button
          type="button"
          onClick={picker.open}
          disabled={busyImage}
          aria-label={`Change photo for ${item.name}`}
          className="absolute inset-0 flex items-center justify-center bg-olive-900/55 text-cream opacity-0 transition hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
        >
          {busyImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
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

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-olive-900">{item.name}</p>
          <span className="rounded-full bg-olive-900/5 px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.08em] text-olive-500">
            {categoryName}
          </span>
          {item.isPopular ? (
            <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[0.625rem] font-medium text-gold-700">Popular</span>
          ) : null}
        </div>
        <p className="mt-1 max-w-xl truncate text-[0.75rem] text-olive-500">{item.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.75rem]">
          <span className="font-medium text-olive-800">{formatCurrency(item.price)}</span>
          <label className="inline-flex items-center gap-1.5 text-olive-600">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-olive-300 text-olive-700 focus:ring-olive-500"
              checked={item.available}
              disabled={mutations.setAvailability.isPending}
              onChange={(event) =>
                mutations.setAvailability.mutate(
                  { productId: item.id, available: event.target.checked },
                  {
                    onError: (error) =>
                      notify({
                        tone: 'error',
                        title: 'Could not update availability',
                        description: getErrorMessage(error),
                      }),
                  },
                )
              }
            />
            Available
          </label>
          {item.imageKey ? (
            <button
              type="button"
              onClick={() =>
                mutations.removeImage.mutate(item.id, {
                  onSuccess: () => notify({ tone: 'success', title: 'Photo removed', description: item.name }),
                  onError: (error) =>
                    notify({ tone: 'error', title: 'Could not remove the photo', description: getErrorMessage(error) }),
                })
              }
              disabled={busyImage}
              className="text-[0.6875rem] font-medium text-terracotta-600 underline-offset-4 hover:underline disabled:opacity-50"
            >
              Remove photo
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEdit}
          iconLeft={<Pencil aria-hidden="true" className="h-3.5 w-3.5" />}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          iconLeft={<Trash2 aria-hidden="true" className="h-3.5 w-3.5" />}
          className="text-terracotta-600 hover:bg-terracotta-50"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

interface MenuItemEditorProps {
  mode: 'create' | 'edit';
  item?: Product;
  categories: ProductCategory[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: ProductInput) => void;
}

function MenuItemEditor({ mode, item, categories, isSaving, onClose, onSave }: MenuItemEditorProps) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item?.price !== undefined ? String(item.price) : '',
    categoryId: item?.categoryId ?? categories[0]?.id ?? '',
    isPopular: item?.isPopular ?? false,
    isVegetarian: item?.isVegetarian ?? false,
    isSpicy: item?.isSpicy ?? false,
    available: item?.available ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (form.name.trim().length < 2) return setError('Add a dish name.');
    if (!form.categoryId) return setError('Choose a menu category.');
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return setError('Enter a valid price.');

    setError(null);
    onSave({
      categoryId: form.categoryId,
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      isPopular: form.isPopular,
      isVegetarian: form.isVegetarian,
      isSpicy: form.isSpicy,
      available: form.available,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-olive-950/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-editor-title"
        className="w-full max-w-lg rounded-panel border border-olive-900/10 bg-cream p-6 shadow-lift"
      >
        <h2 id="menu-editor-title" className="text-[1.25rem] text-olive-900">
          {mode === 'create' ? 'Add a dish' : 'Edit dish'}
        </h2>
        <p className="mt-1 text-[0.75rem] text-olive-500">
          Photos can be uploaded right after saving; they are stored in Cloudinary by the API.
        </p>

        <div className="mt-5 space-y-3.5">
          <label className="block">
            <span className="text-[0.75rem] font-medium text-olive-700">Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-olive-900/15 bg-ivory px-3 py-2 text-[0.8125rem] text-olive-900 outline-none focus:border-olive-500"
              maxLength={120}
            />
          </label>

          <label className="block">
            <span className="text-[0.75rem] font-medium text-olive-700">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-olive-900/15 bg-ivory px-3 py-2 text-[0.8125rem] text-olive-900 outline-none focus:border-olive-500"
              rows={2}
              maxLength={500}
            />
          </label>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="text-[0.75rem] font-medium text-olive-700">Price (USD)</span>
              <input
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-olive-900/15 bg-ivory px-3 py-2 text-[0.8125rem] text-olive-900 outline-none focus:border-olive-500"
              />
            </label>

            <label className="block">
              <span className="text-[0.75rem] font-medium text-olive-700">Category</span>
              <select
                value={form.categoryId}
                onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-olive-900/15 bg-ivory px-3 py-2 text-[0.8125rem] text-olive-900 outline-none focus:border-olive-500"
              >
                <option value="">Choose…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-[0.75rem] text-olive-600">
            {(['isPopular', 'isVegetarian', 'isSpicy', 'available'] as const).map((key) => (
              <label key={key} className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.checked }))}
                  className="h-3.5 w-3.5 rounded border-olive-300 text-olive-700 focus:ring-olive-500"
                />
                {key === 'isPopular'
                  ? 'Popular'
                  : key === 'isVegetarian'
                    ? 'Vegetarian'
                    : key === 'isSpicy'
                      ? 'Spicy'
                      : 'Available'}
              </label>
            ))}
          </div>

          {error ? <p className="text-[0.75rem] text-danger">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={submit} isLoading={isSaving}>
            {mode === 'create' ? 'Add dish' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
