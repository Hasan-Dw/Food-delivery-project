import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { queryKeys } from '@/lib/query-keys';

/** All data the homepage needs, in one place. No fetch logic in components. */
export function useHomeData() {
  const categories = useQuery({
    queryKey: queryKeys.restaurantCategories,
    queryFn: () => services.restaurants.listCategories(),
  });

  const restaurants = useQuery({
    queryKey: queryKeys.restaurants,
    queryFn: () => services.restaurants.list({ perPage: 24 }),
  });

  const popularDishes = useQuery({
    queryKey: queryKeys.popularProducts,
    queryFn: () => services.products.listPopular(8),
  });

  const featured = useQuery({
    queryKey: queryKeys.featuredRestaurants,
    queryFn: () => services.restaurants.getFeatured(),
  });

  const promotions = useQuery({
    queryKey: queryKeys.promotions,
    queryFn: () => services.promotions.list(),
  });

  return { categories, restaurants, popularDishes, featured, promotions };
}
