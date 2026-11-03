import type { RestaurantCategory } from '@/types';

/** Cuisine categories used by discovery and the homepage rail. */
export const restaurantCategories: RestaurantCategory[] = [
  {
    id: 'cat_burgers',
    name: 'Burgers',
    slug: 'burgers',
    imageKey: 'category-burgers',
    itemCount: 64,
    description: 'Smashed, stacked and seriously good.',
  },
  {
    id: 'cat_pizza',
    name: 'Pizza',
    slug: 'pizza',
    imageKey: 'category-pizza',
    itemCount: 58,
    description: 'Blistered crusts, bubbling cheese.',
  },
  {
    id: 'cat_sushi',
    name: 'Sushi',
    slug: 'sushi',
    imageKey: 'category-sushi',
    itemCount: 42,
    description: 'Cut fresh, served cold, done right.',
  },
  {
    id: 'cat_fried-chicken',
    name: 'Fried Chicken',
    slug: 'fried-chicken',
    imageKey: 'category-fried-chicken',
    itemCount: 37,
    description: 'Crunch you can hear across the room.',
  },
  {
    id: 'cat_desserts',
    name: 'Desserts',
    slug: 'desserts',
    imageKey: 'category-desserts',
    itemCount: 51,
    description: 'The reason you saved room.',
  },
  {
    id: 'cat_healthy',
    name: 'Healthy',
    slug: 'healthy',
    imageKey: 'category-healthy',
    itemCount: 73,
    description: 'Bowls, greens and good intentions.',
  },
  {
    id: 'cat_pasta',
    name: 'Pasta',
    slug: 'pasta',
    imageKey: 'category-pasta',
    itemCount: 46,
    description: 'Rolled, cut and sauced by hand.',
  },
  {
    id: 'cat_sandwiches',
    name: 'Sandwiches',
    slug: 'sandwiches',
    imageKey: 'category-sandwiches',
    itemCount: 39,
    description: 'Between two slices of something great.',
  },
];
