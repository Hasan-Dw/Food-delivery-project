import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { queryKeys } from '@/lib/query-keys';
import type { Product, Restaurant, RestaurantCategory } from '@/types';

export interface DishResult {
  product: Product;
  restaurant?: Restaurant;
}

export interface SearchResults {
  categories: RestaurantCategory[];
  restaurants: Restaurant[];
  dishes: DishResult[];
  /** True while the input is empty and the dialog shows curated suggestions. */
  isSuggestions: boolean;
  isLoading: boolean;
  isError: boolean;
  total: number;
  refetch: () => void;
}

function matches(value: string | undefined, term: string): boolean {
  return Boolean(value?.toLowerCase().includes(term));
}

/**
 * Client-side discovery search over the same cached catalogue the homepage
 * already loads. No component fetches directly, and the homepage rail remains
 * the destination for a selected search.
 */
export function useSearchResults(rawQuery: string): SearchResults {
  const term = rawQuery.trim().toLowerCase();

  const categories = useQuery({
    queryKey: queryKeys.restaurantCategories,
    queryFn: () => services.restaurants.listCategories(),
  });

  const restaurants = useQuery({
    queryKey: queryKeys.restaurants,
    queryFn: () => services.restaurants.list({ perPage: 24 }),
  });

  const dishes = useQuery({
    queryKey: queryKeys.popularProducts,
    queryFn: () => services.products.listPopular(8),
  });

  const restaurantById = useMemo(
    () => new Map((restaurants.data?.items ?? []).map((restaurant) => [restaurant.id, restaurant])),
    [restaurants.data],
  );

  const dishResults = useMemo<DishResult[]>(
    () =>
      (dishes.data ?? []).map((product) => ({
        product,
        restaurant: restaurantById.get(product.restaurantId),
      })),
    [dishes.data, restaurantById],
  );

  const results = useMemo(() => {
    if (!term) {
      return {
        categories: (categories.data ?? []).slice(0, 6),
        restaurants: (restaurants.data?.items ?? []).slice(0, 4),
        dishes: dishResults.slice(0, 4),
      };
    }

    const categoryMatches = (categories.data ?? []).filter(
      (category) =>
        matches(category.name, term) || matches(category.slug, term) || matches(category.description, term),
    );

    const restaurantMatches = (restaurants.data?.items ?? []).filter((restaurant) =>
      [restaurant.name, restaurant.tagline, ...restaurant.cuisines, ...restaurant.categorySlugs, restaurant.address.city]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );

    const dishMatches = dishResults.filter(
      ({ product, restaurant }) =>
        matches(product.name, term) ||
        matches(product.description, term) ||
        matches(restaurant?.name, term) ||
        matches(restaurant?.tagline, term),
    );

    return {
      categories: categoryMatches.slice(0, 4),
      restaurants: restaurantMatches.slice(0, 5),
      dishes: dishMatches.slice(0, 5),
    };
  }, [term, categories.data, restaurants.data, dishResults]);

  const total = results.categories.length + results.restaurants.length + results.dishes.length;

  return {
    ...results,
    isSuggestions: !term,
    isLoading: categories.isLoading || restaurants.isLoading || dishes.isLoading,
    isError: categories.isError || restaurants.isError || dishes.isError,
    total,
    refetch: () => {
      void categories.refetch();
      void restaurants.refetch();
      void dishes.refetch();
    },
  };
}
