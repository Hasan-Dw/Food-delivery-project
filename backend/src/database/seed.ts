import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../app.module';
import { setServers } from 'node:dns';
import {
  AccountStatus,
  AddressLabel,
  DriverAvailability,
  PaymentBrand,
  PaymentType,
  RestaurantStatus,
  UserRole,
  VehicleType,
} from '../common/enums/user.enum';
import { PromotionAccent, PromotionDiscountType } from '../common/enums/promotion.enum';
import { Promotion, type PromotionDocument } from '../promotions/schemas/promotion.schema';
import {
  MenuCategory,
  Restaurant,
  RestaurantCategory,
  type MenuCategoryDocument,
  type RestaurantCategoryDocument,
  type RestaurantDocument,
} from '../restaurants/schemas';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { MenuItem, type MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { DriverProfile, type DriverProfileDocument } from '../users/schemas/driver-profile.schema';
import { Order, type OrderDocument } from '../orders/schemas/order.schema';
import { Delivery, type DeliveryDocument } from '../deliveries/schemas/delivery.schema';
import { Review, ReviewType, type ReviewDocument } from '../reviews/schemas/review.schema';
import { OrderStatus, PaymentStatus } from '../common/enums/order.enum';
import { DeliveryStatus } from '../common/enums/delivery.enum';
import { SERVICE_AREA_CITY } from '../common/constants/service-area.constant';
import {
  type Address,
  type PaymentMethod,
  type UserDocument,
} from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { toSlug } from '../common/utils/slug.util';

const CATEGORIES = [
  { slug: 'burgers', name: 'Burgers', imageKey: 'category-burgers', description: 'Smashed, stacked and seriously good.', sortOrder: 1 },
  { slug: 'pizza', name: 'Pizza', imageKey: 'category-pizza', description: 'Blistered crusts, bubbling cheese.', sortOrder: 2 },
  { slug: 'sushi', name: 'Sushi', imageKey: 'category-sushi', description: 'Cut fresh, served cold, done right.', sortOrder: 3 },
  { slug: 'fried-chicken', name: 'Fried Chicken', imageKey: 'category-fried-chicken', description: 'Crunch you can hear across the room.', sortOrder: 4 },
  { slug: 'desserts', name: 'Desserts', imageKey: 'category-desserts', description: 'The reason you saved room.', sortOrder: 5 },
  { slug: 'healthy', name: 'Healthy', imageKey: 'category-healthy', description: 'Bowls, greens and good intentions.', sortOrder: 6 },
  { slug: 'pasta', name: 'Pasta', imageKey: 'category-pasta', description: 'Rolled, cut and sauced by hand.', sortOrder: 7 },
  { slug: 'sandwiches', name: 'Sandwiches', imageKey: 'category-sandwiches', description: 'Between two slices of something great.', sortOrder: 8 },
];

interface SeedAccount {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  status: AccountStatus;
  phone?: string;
  preferences?: {
    dietary?: string[];
    emailReceipts?: boolean;
    orderUpdates?: boolean;
    marketing?: boolean;
  };
}

interface SeedRestaurant {
  name: string;
  /** Old display names that should be renamed in place, never duplicated. */
  legacyNames?: string[];
  tagline: string;
  cuisines: string[];
  categorySlugs: string[];
  imageKey: string;
  deliveryFee: number;
  minOrder: number;
  priceLevel: number;
  estimatedDeliveryMinutes: number[];
  isOpen: boolean;
  description: string;
  offerLabel?: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  openingHours: Array<{ day: string; open: string; close: string }>;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  badges: string[];
  featured: boolean;
}

interface SeedItem {
  category: string;
  name: string;
  description: string;
  price: number;
  imageKey: string;
  calories?: number;
  rating: number;
  reviewCount: number;
  isPopular?: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  available?: boolean;
  optionGroups?: Array<{
    name: string;
    required: boolean;
    minSelections: number;
    maxSelections: number;
    options: Array<{ name: string; priceDelta: number; isDefault?: boolean }>;
  }>;
}

const RESTAURANTS: SeedRestaurant[] = [
  {
    name: 'Saffron & Oak',
    tagline: 'Modern Mediterranean, cooked over fire.',
    cuisines: ['Mediterranean', 'Middle Eastern'],
    categorySlugs: ['healthy', 'sandwiches'],
    imageKey: 'restaurant-saffron-oak',
    deliveryFee: 0,
    minOrder: 12,
    priceLevel: 3,
    estimatedDeliveryMinutes: [25, 35],
    isOpen: true,
    description:
      'A wood-fired kitchen where eastern Mediterranean spice meets produce from the Brooklyn waterfront.',
    offerLabel: 'Free delivery over $25',
    address: {
      line1: '88 Wythe Avenue',
      city: 'Brooklyn',
      state: 'NY',
      postalCode: '11249',
      country: 'USA',
      latitude: 40.7219,
      longitude: -73.9588,
    },
    openingHours: [
      { day: 'Mon - Thu', open: '11:30', close: '22:00' },
      { day: 'Fri - Sat', open: '11:30', close: '23:30' },
      { day: 'Sunday', open: '12:00', close: '21:30' },
    ],
    rating: 4.9,
    reviewCount: 1284,
    distanceKm: 1.2,
    badges: ['Top rated', 'Savora pick'],
    featured: true,
  },
  {
    name: 'Nonna Lucia',
    tagline: 'Handmade pasta and 72-hour pizza dough.',
    cuisines: ['Italian', 'Pizza', 'Pasta'],
    categorySlugs: ['pizza', 'pasta'],
    imageKey: 'restaurant-nonna-lucia',
    deliveryFee: 1.99,
    minOrder: 15,
    priceLevel: 2,
    estimatedDeliveryMinutes: [20, 30],
    isOpen: true,
    description:
      'A neighbourhood trattoria rolling pasta every morning and pulling blistered pies from a wood oven at night.',
    address: {
      line1: '41 Union Avenue',
      city: 'Brooklyn',
      state: 'NY',
      postalCode: '11211',
      country: 'USA',
      latitude: 40.7178,
      longitude: -73.9501,
    },
    openingHours: [
      { day: 'Mon - Thu', open: '12:00', close: '22:00' },
      { day: 'Fri - Sat', open: '12:00', close: '23:00' },
      { day: 'Sunday', open: '12:00', close: '21:00' },
    ],
    rating: 4.7,
    reviewCount: 842,
    distanceKm: 0.9,
    badges: ['Top rated'],
    featured: true,
  },
  {
    name: 'Koji Sushi',
    tagline: 'Quiet sushi counter, sharp knives, cold beer.',
    cuisines: ['Japanese', 'Sushi'],
    categorySlugs: ['sushi', 'healthy'],
    imageKey: 'restaurant-koji-sushi',
    deliveryFee: 2.99,
    minOrder: 18,
    priceLevel: 4,
    estimatedDeliveryMinutes: [30, 45],
    isOpen: true,
    description:
      'Chef-selected cuts, simmered broths and seasonal bowls from a small counter on Orchard Street.',
    address: {
      line1: '14 Orchard Street',
      city: 'New York',
      state: 'NY',
      postalCode: '10002',
      country: 'USA',
      latitude: 40.7156,
      longitude: -73.9918,
    },
    openingHours: [
      { day: 'Tue - Thu', open: '17:00', close: '22:30' },
      { day: 'Fri - Sat', open: '17:00', close: '23:30' },
      { day: 'Sunday', open: '17:00', close: '21:30' },
    ],
    rating: 4.8,
    reviewCount: 957,
    distanceKm: 2.4,
    badges: ['Savora pick'],
    featured: true,
  },
  {
    name: 'The Patty Club',
    tagline: 'Smashed burgers, cold pickles, no ceremony.',
    cuisines: ['American', 'Burgers'],
    categorySlugs: ['burgers', 'fried-chicken'],
    imageKey: 'restaurant-patty-club',
    deliveryFee: 2.49,
    minOrder: 10,
    priceLevel: 2,
    estimatedDeliveryMinutes: [20, 30],
    isOpen: true,
    description:
      'A griddle-first kitchen built around smashed patties, crisp chicken and very good cookies.',
    offerLabel: '20% off your first order',
    address: {
      line1: '233 Nostrand Avenue',
      city: 'Brooklyn',
      state: 'NY',
      postalCode: '11205',
      country: 'USA',
      latitude: 40.6944,
      longitude: -73.9501,
    },
    openingHours: [
      { day: 'Mon - Thu', open: '11:00', close: '23:00' },
      { day: 'Fri - Sat', open: '11:00', close: '00:30' },
      { day: 'Sunday', open: '11:00', close: '22:00' },
    ],
    rating: 4.6,
    reviewCount: 611,
    distanceKm: 1.7,
    badges: ['Offer'],
    featured: false,
  },
  {
    name: 'Casa Veracruz',
    tagline: 'Coastal Mexican, charcoal and citrus.',
    cuisines: ['Mexican', 'Latin American'],
    categorySlugs: ['healthy', 'sandwiches'],
    imageKey: 'restaurant-casa-veracruz',
    deliveryFee: 1.49,
    minOrder: 12,
    priceLevel: 2,
    estimatedDeliveryMinutes: [20, 30],
    isOpen: true,
    description:
      'A coastal kitchen folding fresh tortillas by hand, grilling over charcoal and squeezing citrus over everything.',
    offerLabel: 'Taco Tuesday: 15% off',
    address: {
      line1: '171 Essex Street',
      city: 'New York',
      state: 'NY',
      postalCode: '10002',
      country: 'USA',
      latitude: 40.7187,
      longitude: -73.9882,
    },
    openingHours: [
      { day: 'Mon - Thu', open: '11:30', close: '22:00' },
      { day: 'Fri - Sat', open: '11:30', close: '23:30' },
      { day: 'Sunday', open: '12:00', close: '21:00' },
    ],
    rating: 4.7,
    reviewCount: 534,
    distanceKm: 1.4,
    badges: ['Offer'],
    featured: true,
  },
  {
    name: 'Smoke & Honey',
    tagline: 'Low-and-slow barbecue with a honey finish.',
    cuisines: ['American', 'Barbecue'],
    categorySlugs: ['burgers', 'fried-chicken'],
    imageKey: 'restaurant-smoke-honey',
    deliveryFee: 2.99,
    minOrder: 15,
    priceLevel: 3,
    estimatedDeliveryMinutes: [30, 45],
    isOpen: true,
    description:
      'A backyard pit room smoking brisket overnight, glazing ribs with wildflower honey and serving pie by the slice.',
    address: {
      line1: '410 Tompkins Avenue',
      city: 'Brooklyn',
      state: 'NY',
      postalCode: '11216',
      country: 'USA',
      latitude: 40.6879,
      longitude: -73.9442,
    },
    openingHours: [
      { day: 'Tue - Thu', open: '12:00', close: '22:00' },
      { day: 'Fri - Sat', open: '12:00', close: '23:30' },
      { day: 'Sunday', open: '12:00', close: '20:30' },
    ],
    rating: 4.8,
    reviewCount: 689,
    distanceKm: 2.1,
    badges: ['Top rated'],
    featured: true,
  },
];

const ITEMS_BY_RESTAURANT: Record<string, SeedItem[]> = {
  'Saffron & Oak': [
    {
      category: 'Mains',
      name: 'Charred Saffron Bowl',
      description: 'Herbed grains, charred vegetables, whipped tahini and a saffron drizzle.',
      price: 18,
      imageKey: 'dish-saffron-bowl',
      calories: 620,
      rating: 4.9,
      reviewCount: 212,
      isPopular: true,
      isVegetarian: true,
    },
    {
      category: 'Mains',
      name: 'Wood-Fired Chicken Sandwich',
      description: 'Marinated chicken, pickled onion and garlic yoghurt on sesame flatbread.',
      price: 16,
      imageKey: 'dish-chicken-sandwich',
      calories: 740,
      rating: 4.8,
      reviewCount: 184,
      isPopular: true,
      optionGroups: [
        {
          name: 'Make it yours',
          required: false,
          minSelections: 0,
          maxSelections: 2,
          options: [
            { name: 'Extra chicken', priceDelta: 4 },
            { name: 'Avocado', priceDelta: 2 },
            { name: 'Feta', priceDelta: 1.5 },
          ],
        },
      ],
    },
    {
      category: 'Starters',
      name: 'Burrata & Summer Peach',
      description: 'Creamy burrata, grilled peach, basil oil and toasted seeds.',
      price: 14,
      imageKey: 'dish-burrata',
      calories: 390,
      rating: 4.7,
      reviewCount: 96,
      isVegetarian: true,
    },
    {
      category: 'Starters',
      name: 'Smoked Aubergine Dip',
      description: 'Charred aubergine, tahini, lemon and warm sesame flatbread.',
      price: 11,
      imageKey: 'dish-green-goddess',
      calories: 320,
      rating: 4.6,
      reviewCount: 63,
      isVegetarian: true,
    },
    {
      category: 'Mains',
      name: 'Saffron Roast Chicken',
      description: 'Half chicken roasted with saffron butter, served with charred lemon.',
      price: 24,
      imageKey: 'dish-butter-chicken',
      calories: 810,
      rating: 4.8,
      reviewCount: 137,
    },
    {
      category: 'Sides',
      name: 'Saffron Rice',
      description: 'Basmati rice steamed with saffron, toasted almonds and herbs.',
      price: 6,
      imageKey: 'dish-saffron-bowl',
      calories: 310,
      rating: 4.5,
      reviewCount: 54,
      isVegetarian: true,
    },
    {
      category: 'Sides',
      name: 'Warm Sesame Flatbread',
      description: 'Wood-fired flatbread brushed with sesame butter and sea salt.',
      price: 5,
      imageKey: 'dish-truffle-pizza',
      calories: 290,
      rating: 4.7,
      reviewCount: 71,
      isVegetarian: true,
    },
    {
      category: 'Desserts',
      name: 'Dark Chocolate Torte',
      description: 'Bittersweet chocolate torte with orange cream and cocoa nibs.',
      price: 9,
      imageKey: 'dish-chocolate-torte',
      calories: 470,
      rating: 4.8,
      reviewCount: 102,
      isVegetarian: true,
    },
  ],
  'Nonna Lucia': [
    {
      category: 'Mains',
      name: 'Truffle Pizza',
      description: 'Mozzarella, wild mushrooms, black truffle and thyme.',
      price: 21,
      imageKey: 'dish-truffle-pizza',
      calories: 860,
      rating: 4.9,
      reviewCount: 312,
      isPopular: true,
      isVegetarian: true,
      optionGroups: [
        {
          name: 'Crust',
          required: true,
          minSelections: 1,
          maxSelections: 1,
          options: [
            { name: 'Classic', priceDelta: 0, isDefault: true },
            { name: 'Gluten-free', priceDelta: 2 },
          ],
        },
      ],
    },
    {
      category: 'Mains',
      name: 'Pesto Rigatoni',
      description: 'Rigatoni, basil pesto, pine nuts and aged pecorino.',
      price: 19,
      imageKey: 'dish-pesto-rigatoni',
      calories: 720,
      rating: 4.7,
      reviewCount: 187,
      isPopular: true,
      isVegetarian: true,
    },
    {
      category: 'Starters',
      name: 'Burrata & Tomatoes',
      description: 'Burrata, heirloom tomatoes, basil and a generous glug of olive oil.',
      price: 13,
      imageKey: 'dish-burrata',
      calories: 340,
      rating: 4.6,
      reviewCount: 88,
      isVegetarian: true,
    },
    {
      category: 'Starters',
      name: 'Garlic Focaccia',
      description: 'Warm focaccia with roasted garlic, rosemary and olive oil.',
      price: 8,
      imageKey: 'dish-truffle-pizza',
      calories: 410,
      rating: 4.6,
      reviewCount: 77,
      isVegetarian: true,
    },
    {
      category: 'Mains',
      name: 'Rigatoni alla Vodka',
      description: 'Rigatoni in a creamy tomato vodka sauce with parmesan.',
      price: 20,
      imageKey: 'dish-pesto-rigatoni',
      calories: 790,
      rating: 4.7,
      reviewCount: 143,
      isVegetarian: true,
    },
    {
      category: 'Desserts',
      name: 'Chocolate Torte',
      description: 'Dark chocolate torte with espresso cream and cocoa nibs.',
      price: 9,
      imageKey: 'dish-chocolate-torte',
      calories: 480,
      rating: 4.8,
      reviewCount: 164,
      isVegetarian: true,
    },
    {
      category: 'Desserts',
      name: 'Cannoli Trio',
      description: 'Three crisp cannoli filled with ricotta, pistachio and orange zest.',
      price: 7,
      imageKey: 'dish-cookies',
      calories: 380,
      rating: 4.7,
      reviewCount: 95,
      isVegetarian: true,
    },
    {
      category: 'Desserts',
      name: 'Tiramisu al Caffè',
      description: 'Espresso-soaked savoiardi layered with mascarpone and cocoa.',
      price: 8,
      imageKey: 'dish-chocolate-torte',
      calories: 460,
      rating: 4.8,
      reviewCount: 121,
      isVegetarian: true,
    },
  ],
  'Koji Sushi': [
    {
      category: 'Mains',
      name: 'Salmon Nigiri Set',
      description: 'Eight pieces of salmon nigiri with wasabi and pickled ginger.',
      price: 26,
      imageKey: 'dish-salmon-nigiri',
      calories: 540,
      rating: 4.8,
      reviewCount: 241,
      isPopular: true,
    },
    {
      category: 'Mains',
      name: 'Tonkotsu Ramen',
      description: 'Slow pork broth, chashu, soft egg and spring onion.',
      price: 18,
      imageKey: 'dish-tonkotsu',
      calories: 780,
      rating: 4.7,
      reviewCount: 198,
      isPopular: true,
      isSpicy: true,
    },
    {
      category: 'Mains',
      name: 'Chipotle Salmon',
      description: 'Seared salmon, chipotle glaze, sesame rice and greens.',
      price: 22,
      imageKey: 'dish-chipotle-salmon',
      calories: 610,
      rating: 4.6,
      reviewCount: 121,
      isSpicy: true,
      available: false,
    },
    {
      category: 'Starters',
      name: 'Green Goddess Salad',
      description: 'Crisp greens, avocado, cucumber and a bright herb dressing.',
      price: 11,
      imageKey: 'dish-green-goddess',
      calories: 280,
      rating: 4.5,
      reviewCount: 74,
      isVegetarian: true,
    },
    {
      category: 'Starters',
      name: 'Edamame with Sea Salt',
      description: 'Steamed edamame pods finished with flaky sea salt.',
      price: 6,
      imageKey: 'dish-green-goddess',
      calories: 190,
      rating: 4.5,
      reviewCount: 88,
      isVegetarian: true,
    },
    {
      category: 'Sides',
      name: 'Sesame Rice',
      description: 'Short-grain rice with toasted sesame and pickled ginger.',
      price: 5,
      imageKey: 'dish-saffron-bowl',
      calories: 260,
      rating: 4.4,
      reviewCount: 45,
      isVegetarian: true,
    },
    {
      category: 'Sides',
      name: 'Pickled Cucumber',
      description: 'Crunchy cucumber with rice vinegar, chilli and sesame.',
      price: 5,
      imageKey: 'dish-green-goddess',
      calories: 90,
      rating: 4.3,
      reviewCount: 39,
      isVegetarian: true,
      isSpicy: true,
    },
    {
      category: 'Desserts',
      name: 'Matcha Cookie Box',
      description: 'Four soft matcha cookies with white chocolate and sea salt.',
      price: 7,
      imageKey: 'dish-cookies',
      calories: 360,
      rating: 4.6,
      reviewCount: 57,
      isVegetarian: true,
    },
  ],
  'The Patty Club': [
    {
      category: 'Starters',
      name: 'Loaded Brisket Fries',
      description: 'Crispy fries piled with smoked brisket, cheese sauce and pickles.',
      price: 10,
      imageKey: 'dish-brisket',
      calories: 720,
      rating: 4.7,
      reviewCount: 112,
    },
    {
      category: 'Mains',
      name: 'Smash Burger',
      description: 'Two smashed patties, American cheese, pickles and house sauce.',
      price: 15,
      imageKey: 'dish-smash-burger',
      calories: 890,
      rating: 4.8,
      reviewCount: 276,
      isPopular: true,
      optionGroups: [
        {
          name: 'Patty',
          required: true,
          minSelections: 1,
          maxSelections: 1,
          options: [
            { name: 'Single patty', priceDelta: 0, isDefault: true },
            { name: 'Double patty', priceDelta: 4 },
            { name: 'Plant-based patty', priceDelta: 2.5 },
          ],
        },
        {
          name: 'Make it yours',
          required: false,
          minSelections: 0,
          maxSelections: 3,
          options: [
            { name: 'Smoked bacon', priceDelta: 2 },
            { name: 'Extra cheddar', priceDelta: 1.5 },
            { name: 'Pickled jalapeno', priceDelta: 0.75 },
            { name: 'Fried egg', priceDelta: 2 },
          ],
        },
      ],
    },
    {
      category: 'Mains',
      name: 'Brisket Plate',
      description: 'Slow-smoked brisket, house pickles and a soft milk bun.',
      price: 22,
      imageKey: 'dish-brisket',
      calories: 940,
      rating: 4.7,
      reviewCount: 143,
      isPopular: true,
    },
    {
      category: 'Mains',
      name: 'Crispy Chicken Sandwich',
      description: 'Buttermilk chicken, slaw and hot honey on a toasted bun.',
      price: 14,
      imageKey: 'dish-chicken-sandwich',
      calories: 760,
      rating: 4.6,
      reviewCount: 126,
    },
    {
      category: 'Sides',
      name: 'House Slaw',
      description: 'Crunchy cabbage, carrot and apple in a tangy buttermilk dressing.',
      price: 5,
      imageKey: 'dish-green-goddess',
      calories: 180,
      rating: 4.4,
      reviewCount: 48,
      isVegetarian: true,
    },
    {
      category: 'Sides',
      name: 'Pickle Plate',
      description: 'House-pickled cucumbers, onions and jalapenos.',
      price: 4,
      imageKey: 'dish-green-goddess',
      calories: 70,
      rating: 4.5,
      reviewCount: 36,
      isVegetarian: true,
      isSpicy: true,
    },
    {
      category: 'Desserts',
      name: 'Chocolate Chip Cookies',
      description: 'Four warm cookies with sea salt and dark chocolate.',
      price: 6,
      imageKey: 'dish-cookies',
      calories: 420,
      rating: 4.9,
      reviewCount: 211,
      isVegetarian: true,
    },
    {
      category: 'Desserts',
      name: 'Chocolate Torte',
      description: 'A dense slice of dark chocolate torte with vanilla cream.',
      price: 8,
      imageKey: 'dish-chocolate-torte',
      calories: 480,
      rating: 4.8,
      reviewCount: 134,
      isVegetarian: true,
    },
  ],
  'Casa Veracruz': [
    {
      category: 'Starters',
      name: 'Guacamole & Warm Chips',
      description: 'Hand-mashed avocado, lime, coriander and warm blue corn chips.',
      price: 9,
      imageKey: 'dish-green-goddess',
      calories: 340,
      rating: 4.7,
      reviewCount: 143,
      isVegetarian: true,
    },
    {
      category: 'Starters',
      name: 'Charred Corn Elote',
      description: 'Grilled corn, chipotle crema, cotija and lime.',
      price: 7,
      imageKey: 'dish-green-goddess',
      calories: 260,
      rating: 4.6,
      reviewCount: 88,
      isVegetarian: true,
      isSpicy: true,
    },
    {
      category: 'Mains',
      name: 'Birria Tacos',
      description: 'Slow-braised beef, melted cheese and consommé for dipping.',
      price: 16,
      imageKey: 'dish-brisket',
      calories: 720,
      rating: 4.9,
      reviewCount: 264,
      isPopular: true,
      optionGroups: [
        {
          name: 'Salsa',
          required: false,
          minSelections: 0,
          maxSelections: 2,
          options: [
            { name: 'Salsa verde', priceDelta: 0, isDefault: true },
            { name: 'Habanero', priceDelta: 0.5 },
            { name: 'Smoky chipotle', priceDelta: 0.5 },
          ],
        },
      ],
    },
    {
      category: 'Mains',
      name: 'Grilled Fish Tacos',
      description: 'Charred white fish, cabbage slaw, pickled onion and lime crema.',
      price: 15,
      imageKey: 'dish-chipotle-salmon',
      calories: 540,
      rating: 4.7,
      reviewCount: 119,
      isPopular: true,
    },
    {
      category: 'Mains',
      name: 'Chicken Tinga Bowl',
      description: 'Chipotle chicken, rice, black beans, avocado and crisp tortillas.',
      price: 14,
      imageKey: 'dish-butter-chicken',
      calories: 680,
      rating: 4.6,
      reviewCount: 97,
    },
    {
      category: 'Sides',
      name: 'Cilantro Rice',
      description: 'Steamed rice tossed with lime, coriander and toasted pepitas.',
      price: 4,
      imageKey: 'dish-saffron-bowl',
      calories: 240,
      rating: 4.4,
      reviewCount: 42,
      isVegetarian: true,
    },
    {
      category: 'Sides',
      name: 'Black Beans',
      description: 'Slow-simmered black beans with cumin and orange peel.',
      price: 4,
      imageKey: 'dish-saffron-bowl',
      calories: 210,
      rating: 4.5,
      reviewCount: 38,
      isVegetarian: true,
    },
    {
      category: 'Desserts',
      name: 'Churros con Chocolate',
      description: 'Cinnamon-sugar churros with thick dark chocolate sauce.',
      price: 7,
      imageKey: 'dish-cookies',
      calories: 430,
      rating: 4.8,
      reviewCount: 156,
      isVegetarian: true,
    },
    {
      category: 'Drinks',
      name: 'Hibiscus Agua Fresca',
      description: 'Chilled hibiscus tea with lime and a touch of cane sugar.',
      price: 4,
      imageKey: 'dish-green-goddess',
      calories: 90,
      rating: 4.6,
      reviewCount: 61,
      isVegetarian: true,
    },
  ],
  'Smoke & Honey': [
    {
      category: 'Starters',
      name: 'Pit-Smoked Wings',
      description: 'Oak-smoked wings glazed with honey, chilli and cider vinegar.',
      price: 11,
      imageKey: 'dish-chicken-sandwich',
      calories: 620,
      rating: 4.8,
      reviewCount: 174,
      isPopular: true,
      isSpicy: true,
    },
    {
      category: 'Starters',
      name: 'Brisket Loaded Fries',
      description: 'Crispy fries, chopped brisket, cheese sauce and pickled jalapeno.',
      price: 12,
      imageKey: 'dish-brisket',
      calories: 780,
      rating: 4.7,
      reviewCount: 132,
    },
    {
      category: 'Mains',
      name: 'Honey-Glazed Half Chicken',
      description: 'Slow-smoked half chicken finished over the fire with honey glaze.',
      price: 19,
      imageKey: 'dish-butter-chicken',
      calories: 860,
      rating: 4.9,
      reviewCount: 208,
      isPopular: true,
    },
    {
      category: 'Mains',
      name: 'Smoked Brisket Plate',
      description: 'Twelve-hour brisket, pickles, onions and a slice of white bread.',
      price: 24,
      imageKey: 'dish-brisket',
      calories: 980,
      rating: 4.9,
      reviewCount: 246,
      isPopular: true,
    },
    {
      category: 'Mains',
      name: 'Pulled Pork Sandwich',
      description: 'Smoked pork shoulder, tangy slaw and Alabama white sauce.',
      price: 14,
      imageKey: 'dish-smash-burger',
      calories: 740,
      rating: 4.6,
      reviewCount: 118,
    },
    {
      category: 'Sides',
      name: 'Charred Broccolini',
      description: 'Fire-charred broccolini with lemon, garlic and toasted almonds.',
      price: 6,
      imageKey: 'dish-green-goddess',
      calories: 180,
      rating: 4.5,
      reviewCount: 47,
      isVegetarian: true,
    },
    {
      category: 'Sides',
      name: 'Skillet Cornbread',
      description: 'Buttermilk cornbread baked in a cast-iron skillet with honey butter.',
      price: 6,
      imageKey: 'dish-cookies',
      calories: 390,
      rating: 4.7,
      reviewCount: 83,
      isVegetarian: true,
    },
    {
      category: 'Desserts',
      name: 'Pecan Pie Slice',
      description: 'Brown-butter pecan pie with a flaky crust and vanilla cream.',
      price: 8,
      imageKey: 'dish-chocolate-torte',
      calories: 520,
      rating: 4.8,
      reviewCount: 96,
      isVegetarian: true,
    },
    {
      category: 'Drinks',
      name: 'Sweet Tea Lemonade',
      description: 'Brewed black tea, fresh lemon and a little brown sugar.',
      price: 4,
      imageKey: 'dish-green-goddess',
      calories: 110,
      rating: 4.5,
      reviewCount: 52,
      isVegetarian: true,
    },
  ],
};

/**
 * The original preview fixtures above are retained for backwards-compatible
 * local databases, but the development demonstration uses this explicit
 * Latakia catalog. Image URLs can be supplied through the optional
 * SEED_IMAGE_URL_* variables after uploading the assets to Cloudinary.
 */
const DEMO_RESTAURANTS: SeedRestaurant[] = [
  {
    name: 'Shawarmati',
    legacyNames: ['شاورمتي'],
    tagline: 'Syrian shawarma from the grill.',
    cuisines: ['Syrian Shawarma', 'Grilled Chicken', 'Sandwiches', 'Fast Food'],
    categorySlugs: ['sandwiches', 'fried-chicken'],
    imageKey: 'dish-chicken-sandwich',
    deliveryFee: 1.5,
    minOrder: 5,
    priceLevel: 2,
    estimatedDeliveryMinutes: [20, 35],
    isOpen: true,
    description: 'Fresh Syrian shawarma, grilled chicken and warm sandwiches prepared to order in Latakia.',
    address: {
      line1: 'Approximate public map location near Sheikh Daher',
      city: 'Latakia',
      state: 'Latakia',
      postalCode: '',
      country: 'Syria',
      latitude: 35.5236,
      longitude: 35.7784,
    },
    openingHours: [{ day: 'Every day', open: '11:00', close: '23:30' }],
    rating: 4.8,
    reviewCount: 128,
    distanceKm: 1.2,
    badges: ['Latakia demo', 'Popular'],
    featured: true,
  },
  {
    name: 'Al Laffah',
    legacyNames: ['اللفاح'],
    tagline: 'Shawarma and Syrian sandwiches, made to order.',
    cuisines: ['Shawarma', 'Syrian Sandwiches', 'Grilled Food', 'Fast Food'],
    categorySlugs: ['sandwiches', 'fried-chicken'],
    imageKey: 'feature-saffron-plate',
    deliveryFee: 1.75,
    minOrder: 5,
    priceLevel: 2,
    estimatedDeliveryMinutes: [25, 40],
    isOpen: true,
    description: 'A relaxed Latakia kitchen serving generous shawarma plates, grilled food and Syrian sandwiches.',
    address: {
      line1: 'Approximate public map location near Al-Raml Al-Janoubi',
      city: 'Latakia',
      state: 'Latakia',
      postalCode: '',
      country: 'Syria',
      latitude: 35.5069,
      longitude: 35.7734,
    },
    openingHours: [{ day: 'Every day', open: '11:00', close: '00:00' }],
    rating: 4.7,
    reviewCount: 96,
    distanceKm: 2.1,
    badges: ['Latakia demo'],
    featured: true,
  },
  {
    name: 'Sahtain',
    legacyNames: ['صحتين'],
    tagline: 'Syrian food made for sharing.',
    cuisines: ['Syrian Food', 'Grills', 'Meals', 'Appetizers'],
    categorySlugs: ['healthy', 'sandwiches'],
    imageKey: 'dish-butter-chicken',
    deliveryFee: 2,
    minOrder: 7,
    priceLevel: 3,
    estimatedDeliveryMinutes: [30, 45],
    isOpen: true,
    description: 'Comforting Syrian meals, mixed grills and classic appetizers for family tables in Latakia.',
    address: {
      line1: 'Approximate public map location near Al-Azhari',
      city: 'Latakia',
      state: 'Latakia',
      postalCode: '',
      country: 'Syria',
      latitude: 35.5351,
      longitude: 35.7953,
    },
    openingHours: [{ day: 'Every day', open: '12:00', close: '23:00' }],
    rating: 4.9,
    reviewCount: 141,
    distanceKm: 2.8,
    badges: ['Latakia demo', 'Family meals'],
    featured: true,
  },
];

const DEMO_ITEMS_BY_RESTAURANT: Record<string, SeedItem[]> = {
  Shawarmati: [
    { category: 'Mains', name: 'شاورما دجاج / Chicken Shawarma', description: 'Tender marinated chicken shawarma with garlic sauce and pickles.', price: 4.5, imageKey: 'dish-chicken-sandwich', rating: 4.8, reviewCount: 42, isPopular: true },
    { category: 'Mains', name: 'شاورما لحم / Meat Shawarma', description: 'Spiced beef shawarma served with tahini, parsley and pickles.', price: 5.5, imageKey: 'dish-brisket', rating: 4.7, reviewCount: 31 },
    { category: 'Mains', name: 'شاورما عربي / Arabic Shawarma', description: 'Sliced chicken shawarma with fries, garlic sauce and flatbread.', price: 7, imageKey: 'dish-chicken-sandwich', rating: 4.9, reviewCount: 55, isPopular: true },
    { category: 'Sides', name: 'بطاطا مقلية / French Fries', description: 'Crisp golden fries with a pinch of Syrian spices.', price: 2, imageKey: 'dish-saffron-bowl', rating: 4.5, reviewCount: 18, isVegetarian: true },
    { category: 'Sides', name: 'ثوم / Garlic Sauce', description: 'Creamy house garlic sauce.', price: 1, imageKey: 'dish-green-goddess', rating: 4.6, reviewCount: 12, isVegetarian: true },
    { category: 'Starters', name: 'فتوش / Fattoush', description: 'Crisp salad with toasted bread, herbs and sumac dressing.', price: 3.5, imageKey: 'dish-green-goddess', rating: 4.6, reviewCount: 20, isVegetarian: true },
  ],
  'Al Laffah': [
    { category: 'Mains', name: 'ساندويش شاورما / Shawarma Sandwich', description: 'Warm saj bread filled with chicken shawarma and fresh toppings.', price: 4, imageKey: 'dish-chicken-sandwich', rating: 4.8, reviewCount: 37, isPopular: true },
    { category: 'Mains', name: 'بروستد دجاج / Chicken Broast', description: 'Crispy seasoned chicken with fries and garlic sauce.', price: 8, imageKey: 'dish-butter-chicken', rating: 4.7, reviewCount: 29 },
    { category: 'Mains', name: 'فروج مشوي / Grilled Chicken', description: 'Half chicken grilled with lemon, garlic and Syrian spices.', price: 9, imageKey: 'dish-butter-chicken', rating: 4.8, reviewCount: 24 },
    { category: 'Sides', name: 'حمص / Hummus', description: 'Silky chickpea hummus with olive oil.', price: 3, imageKey: 'dish-green-goddess', rating: 4.7, reviewCount: 21, isVegetarian: true },
    { category: 'Sides', name: 'بطاطا حرة / Spiced Potatoes', description: 'Golden potatoes tossed with coriander, garlic and chilli.', price: 3, imageKey: 'dish-saffron-bowl', rating: 4.6, reviewCount: 17, isVegetarian: true, isSpicy: true },
    { category: 'Starters', name: 'فلافل / Falafel', description: 'Crisp chickpea falafel with tahini and herbs.', price: 3.5, imageKey: 'dish-green-goddess', rating: 4.7, reviewCount: 26, isVegetarian: true },
  ],
  Sahtain: [
    { category: 'Mains', name: 'مشاوي مشكلة / Mixed Grill', description: 'A generous selection of kebab, shish tawook and grilled meat.', price: 14, imageKey: 'dish-brisket', rating: 4.9, reviewCount: 48, isPopular: true },
    { category: 'Mains', name: 'شيش طاووق / Shish Tawook', description: 'Charcoal-grilled chicken skewers with garlic sauce.', price: 10, imageKey: 'dish-butter-chicken', rating: 4.8, reviewCount: 32 },
    { category: 'Mains', name: 'وجبة دجاج / Chicken Meal', description: 'Grilled chicken, rice, salad and house sauce.', price: 9.5, imageKey: 'dish-butter-chicken', rating: 4.7, reviewCount: 27 },
    { category: 'Starters', name: 'متبل / Moutabal', description: 'Smoky aubergine dip with tahini and lemon.', price: 3.5, imageKey: 'dish-green-goddess', rating: 4.7, reviewCount: 19, isVegetarian: true },
    { category: 'Starters', name: 'تبولة / Tabbouleh', description: 'Parsley, tomato, bulgur and lemon olive-oil dressing.', price: 3.5, imageKey: 'dish-green-goddess', rating: 4.6, reviewCount: 16, isVegetarian: true },
    { category: 'Sides', name: 'أرز بالشعيرية / Vermicelli Rice', description: 'Fluffy rice with toasted vermicelli.', price: 2.5, imageKey: 'dish-saffron-bowl', rating: 4.5, reviewCount: 14, isVegetarian: true },
  ],
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required. Add it to backend/.env before running the seed script.`,
    );
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

async function ensureCategories(model: Model<RestaurantCategoryDocument>): Promise<void> {
  for (const category of CATEGORIES) {
    await model.updateOne(
      { slug: category.slug },
      { $set: category },
      { upsert: true },
    );
  }
}

async function ensureAccount(
  usersService: UsersService,
  account: SeedAccount,
): Promise<UserDocument> {
  const existing = await usersService.findByEmail(account.email);
  if (existing) {
    Logger.log(`Account already exists: ${account.email}`, 'Seed');
    return existing;
  }

  const created = await usersService.create({
    email: account.email,
    password: account.password,
    fullName: account.fullName,
    phone: account.phone,
    role: account.role,
    accountStatus: account.status,
    preferences: account.preferences,
  });

  Logger.log(`Created account: ${account.email} (${account.role})`, 'Seed');
  return created;
}

async function ensureCustomerExtras(
  user: UserDocument,
  extras: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    instructions?: string;
    coordinates?: { lat: number; lng: number };
    cardLast4?: string;
  } = {},
): Promise<void> {
  if ((user.addresses ?? []).length === 0) {
    user.addresses.push({
      label: AddressLabel.HOME,
      line1: extras.line1 ?? '214 Bedford Avenue',
      line2: extras.line2 ?? 'Apt 3B',
      city: extras.city ?? 'Brooklyn',
      state: extras.state ?? 'NY',
      ...(extras.postalCode?.trim()
  ? { postalCode: extras.postalCode.trim() }
  : {}),
      country: extras.country ?? 'USA',
      instructions: extras.instructions ?? 'Buzzer 3B',
      isDefault: true,
      coordinates: extras.coordinates ?? { lat: 40.7178, lng: -73.9573 },
    } as Address);
  }

  if ((user.paymentMethods ?? []).length === 0) {
    const last4 = extras.cardLast4 ?? '4242';
    user.paymentMethods.push({
      type: PaymentType.CARD,
      label: `Visa ending ${last4}`,
      brand: PaymentBrand.VISA,
      last4,
      expiry: '12/29',
      isDefault: true,
    } as PaymentMethod);
  }

  await user.save();
}

async function ensureDriverProfile(
  driverModel: Model<DriverProfileDocument>,
  usersService: UsersService,
  user: UserDocument,
  profile: {
    status: AccountStatus;
    availability: DriverAvailability;
    vehicle: VehicleType;
    serviceArea: string;
    rating: number;
    completedDeliveries: number;
    totalEarningsCents: number;
    approvedAt?: Date;
    location?: { lat: number; lng: number };
  },
): Promise<void> {
  let document = await driverModel.findOne({ userId: user._id }).exec();

  if (!document) {
    await usersService.createDriverProfile(user._id.toString(), {
      phone: user.phone,
      serviceArea: profile.serviceArea,
      vehicle: profile.vehicle,
    });
    document = await driverModel.findOne({ userId: user._id }).exec();
    Logger.log(`Created driver profile for ${user.email}`, 'Seed');
  }

  if (!document) {
    throw new Error(`Driver profile for ${user.email} could not be created.`);
  }

  await driverModel.updateOne(
    { _id: document._id },
    {
      $set: {
        serviceArea: profile.serviceArea,
        phone: user.phone,
        accountStatus: profile.status,
        availability: profile.availability,
        rating: profile.rating,
        completedDeliveries: profile.completedDeliveries,
        totalEarningsCents: profile.totalEarningsCents,
        approvedAt: profile.approvedAt ?? new Date('2024-01-01T00:00:00.000Z'),
        ...(profile.location
          ? {
              lastLocation: {
                ...profile.location,
                updatedAt: new Date(),
              },
            }
          : {}),
      },
    },
  );
}

function imageUrl(scope: string, fallback: string): string {
  return optionalEnv(`SEED_IMAGE_URL_${scope}`, fallback);
}

async function ensureRestaurant(
  restaurantsService: RestaurantsService,
  restaurantModel: Model<RestaurantDocument>,
  ownerId: string,
  seed: SeedRestaurant,
): Promise<RestaurantDocument> {
  const legacyNames = seed.legacyNames ?? [];
  const existing =
    (await restaurantModel.findOne({ name: seed.name })) ??
    (legacyNames.length
      ? await restaurantModel.findOne({ name: { $in: legacyNames } })
      : null);
  const seedImageKey = imageUrl(
    seed.name === 'Shawarmati'
      ? 'SHAWARMATI_RESTAURANT'
      : seed.name === 'Al Laffah'
        ? 'AL_LAFFAH_RESTAURANT'
        : seed.name === 'Sahtain'
          ? 'SAHTAIN_RESTAURANT'
          : 'RESTAURANT',
    seed.imageKey,
  );
  const preserveUploadedImage =
    existing &&
    /^https?:\/\//i.test(existing.imageKey ?? '') &&
    seedImageKey === seed.imageKey;

  const input = {
      name: seed.name,
      tagline: seed.tagline,
      cuisines: seed.cuisines,
      categorySlugs: seed.categorySlugs,
      imageKey: preserveUploadedImage ? existing.imageKey : seedImageKey,
      deliveryFee: seed.deliveryFee,
      minOrder: seed.minOrder,
      priceLevel: seed.priceLevel,
      estimatedDeliveryMinutes: seed.estimatedDeliveryMinutes,
      isOpen: seed.isOpen,
      description: seed.description,
      offerLabel: seed.offerLabel,
      address: {
        line1: seed.address.line1,
        city: seed.address.city,
        state: seed.address.state,
        postalCode: seed.address.postalCode,
        country: seed.address.country,
        latitude: seed.address.latitude,
        longitude: seed.address.longitude,
      },
      openingHours: seed.openingHours,
    };

  if (existing) {
    await restaurantModel.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...input,
          slug: toSlug(seed.name),
          ownerId: new Types.ObjectId(ownerId),
          status: RestaurantStatus.APPROVED,
          rating: seed.rating,
          reviewCount: seed.reviewCount,
          distanceKm: seed.distanceKm,
          badges: seed.badges,
          featured: seed.featured,
        },
      },
    );
    Logger.log(`Updated demo restaurant: ${seed.name}`, 'Seed');
    return (await restaurantModel.findById(existing._id))!;
  }

  const created = await restaurantsService.createForOwner(
    ownerId,
    input,
    RestaurantStatus.APPROVED,
  );

  const document = await restaurantModel.findByIdAndUpdate(
    created.id,
    {
      $set: {
        slug: toSlug(seed.name),
        rating: seed.rating,
        reviewCount: seed.reviewCount,
        distanceKm: seed.distanceKm,
        badges: seed.badges,
        featured: seed.featured,
      },
    },
    { new: true },
  );

  Logger.log(`Created restaurant: ${seed.name}`, 'Seed');
  return document ?? (await restaurantModel.findById(created.id))!;
}

async function seedMenu(
  menuItemModel: Model<MenuItemDocument>,
  menuCategoryModel: Model<MenuCategoryDocument>,
  restaurant: RestaurantDocument,
  items: SeedItem[],
): Promise<void> {
  const categories = await menuCategoryModel.find({ restaurantId: restaurant._id });
  const byName = new Map(categories.map((category) => [category.name, category._id]));

  const restaurantImageKey =
    restaurant.name === 'Shawarmati'
      ? 'SHAWARMATI'
      : restaurant.name === 'Al Laffah'
        ? 'AL_LAFFAH'
        : 'SAHTAIN';

  const operations = items.map((item, index) => {
    const categoryId = byName.get(item.category);
    if (!categoryId) {
      throw new Error(`Menu category "${item.category}" is missing for ${restaurant.name}.`);
    }

    return {
      updateOne: {
        filter: { restaurantId: restaurant._id, name: item.name },
        update: {
          $setOnInsert: {
            restaurantId: restaurant._id,
            categoryId,
            name: item.name,
            description: item.description,
            priceCents: Math.round(item.price * 100),
            imageKey: imageUrl(
              `MENU_${restaurantImageKey}_${index + 1}`,
              item.imageKey,
            ),
            calories: item.calories,
            rating: item.rating,
            reviewCount: item.reviewCount,
            isPopular: item.isPopular ?? false,
            isVegetarian: item.isVegetarian ?? false,
            isSpicy: item.isSpicy ?? false,
            available: item.available ?? true,
            optionGroups: (item.optionGroups ?? []).map((group) => ({
              name: group.name,
              required: group.required,
              minSelections: group.minSelections,
              maxSelections: group.maxSelections,
              options: group.options.map((option) => ({
                name: option.name,
                priceDeltaCents: Math.round(option.priceDelta * 100),
                isDefault: option.isDefault ?? false,
              })),
            })),
          },
        },
        upsert: true,
      },
    };
  });

  const result = await menuItemModel.bulkWrite(operations);
  Logger.log(
    `Ensured ${items.length} menu items for ${restaurant.name} (${result.upsertedCount} new)`,
    'Seed',
  );
}

const SEED_PROMOTIONS = [
  {
    code: 'WELCOME20',
    title: '20% off your first order',
    subtitle: 'New to Savora? Take 20% off a first order over $20.',
    description:
      'One welcome discount per customer. Applied at checkout once the subtotal reaches $20.',
    imageKey: 'offer-table-spread',
    accent: PromotionAccent.TERRACOTTA,
    discountType: PromotionDiscountType.PERCENTAGE,
    percentOff: 20,
    minOrderCents: 2000,
    expiresAt: new Date('2027-12-31T23:59:59.000Z'),
    usageLimit: 0,
    perCustomerLimit: 1,
  },
  {
    code: 'FREESHIP5',
    title: 'A little off the delivery',
    subtitle: '$5 off orders over $25.',
    description:
      'A flat $5 platform credit on any order over $25. Available while the campaign lasts.',
    imageKey: 'offer-pizza-night',
    accent: PromotionAccent.OLIVE,
    discountType: PromotionDiscountType.FIXED,
    amountOffCents: 500,
    minOrderCents: 2500,
    expiresAt: new Date('2027-06-30T23:59:59.000Z'),
    usageLimit: 500,
    perCustomerLimit: 2,
  },
  {
    code: 'SWEET10',
    title: 'Something sweet, 10% off',
    subtitle: 'Ten percent off desserts and everything else.',
    description:
      'A platform-wide 10% discount with no minimum order. One per customer.',
    imageKey: 'offer-something-sweet',
    accent: PromotionAccent.GOLD,
    discountType: PromotionDiscountType.PERCENTAGE,
    percentOff: 10,
    minOrderCents: 0,
    expiresAt: new Date('2027-03-31T23:59:59.000Z'),
    usageLimit: 0,
    perCustomerLimit: 1,
  },
];

async function ensurePromotions(
  promotionModel: Model<PromotionDocument>,
  adminId?: string,
): Promise<void> {
  for (const promotion of SEED_PROMOTIONS) {
    await promotionModel.updateOne(
      { code: promotion.code },
      {
        $setOnInsert: {
          ...promotion,
          active: true,
          usageCount: 0,
          restaurantId: null,
          ...(adminId ? { createdBy: adminId } : {}),
        },
      },
      { upsert: true },
    );
  }

  Logger.log(`Ensured ${SEED_PROMOTIONS.length} promotions`, 'Seed');
}

async function seedDemoActivity(params: {
  orderModel: Model<OrderDocument>;
  deliveryModel: Model<DeliveryDocument>;
  reviewModel: Model<ReviewDocument>;
  menuItemModel: Model<MenuItemDocument>;
  driverModel: Model<DriverProfileDocument>;
  restaurantModel: Model<RestaurantDocument>;
  customers: UserDocument[];
  restaurants: RestaurantDocument[];
}): Promise<void> {
  const {
    orderModel,
    deliveryModel,
    reviewModel,
    menuItemModel,
    driverModel,
    restaurantModel,
    customers,
    restaurants,
  } = params;

  if (customers.length < 1 || restaurants.length < 1) return;

  // Remove the superseded one-review-per-order index so a single delivered
  // order can carry restaurant, dish and delivery ratings independently.
  await reviewModel.collection.dropIndex('orderId_1').catch(() => undefined);
  await reviewModel.createIndexes().catch(() => undefined);

  const scenarios = [
    {
      key: 'a',
      customerIndex: 1,
      daysAgo: 2,
      rating: 5,
      deliveryRating: 5,
      serviceRating: 5,
      restaurantComment: 'Fresh, hot and exactly what we ordered. The shawarma travels really well.',
      itemComment: 'Generous filling and the garlic sauce is excellent.',
      deliveryComment: 'Arrived warm and the driver kept us updated the whole way.',
    },
    {
      key: 'b',
      customerIndex: 0,
      daysAgo: 9,
      rating: 4,
      deliveryRating: 4,
      serviceRating: 4,
      restaurantComment: 'Great flavour and good portions. Pickup was a little slower than expected.',
      itemComment: 'Really tasty; I would order this again.',
      deliveryComment: 'Friendly delivery and the order was complete.',
    },
    {
      key: 'c',
      customerIndex: 0,
      daysAgo: 21,
      rating: 5,
      deliveryRating: 5,
      serviceRating: 4,
      restaurantComment: 'Our favourite in Latakia. Consistent quality every time.',
      itemComment: 'Cooked perfectly and still hot on arrival.',
      deliveryComment: 'Quick delivery; the tracking was accurate.',
    },
  ];

  const drivers = await driverModel.find().sort({ createdAt: 1 }).limit(10);

  for (const [restaurantIndex, restaurant] of restaurants.entries()) {
    const menuItems = await menuItemModel
      .find({ restaurantId: restaurant._id })
      .sort({ isPopular: -1, name: 1 })
      .limit(3);

    if (menuItems.length === 0) continue;

    for (const [scenarioIndex, scenario] of scenarios.entries()) {
      const customer = customers[scenario.customerIndex % customers.length];
      const placedAt = new Date(Date.now() - scenario.daysAgo * 24 * 60 * 60 * 1000);
      placedAt.setHours(19, 15, 0, 0);
      const completedAt = new Date(placedAt.getTime() + 48 * 60 * 1000);
      const idempotencyKey = `seed-demo-order-${restaurant._id.toString()}-${scenario.key}`;
      const lineItems = menuItems.slice(0, 2).map((item, index) => ({
        productId: item._id,
        name: item.name,
        imageKey: item.imageKey,
        quantity: index === 0 ? 2 : 1,
        unitPriceCents: item.priceCents,
        selectedOptions: [],
      }));
      const subtotalCents = lineItems.reduce(
        (sum, item) => sum + item.unitPriceCents * item.quantity,
        0,
      );
      const deliveryFeeCents = Math.round(restaurant.deliveryFee * 100);
      const address = customer.addresses?.[0];
      const orderCode = `SV-DEMO${restaurantIndex + 1}${scenarioIndex + 1}`;

      const order = await orderModel.findOneAndUpdate(
        { idempotencyKey },
        {
          $setOnInsert: {
            idempotencyKey,
            code: orderCode,
            customerId: customer._id,
            customerName: customer.fullName,
            customerPhone: customer.phone ?? '',
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            restaurantImageKey: restaurant.imageKey,
            items: lineItems,
            status: OrderStatus.COMPLETED,
            deliveryAddress: {
              label: AddressLabel.HOME,
              line1: address?.line1 ?? 'Approximate home location near Sheikh Daher',
              city: SERVICE_AREA_CITY,
              state: SERVICE_AREA_CITY,
              postalCode: '',
              country: 'Syria',
              instructions: address?.instructions ?? '',
              isDefault: true,
              coordinates: address?.coordinates ?? { lat: 35.523, lng: 35.779 },
            },
            totals: {
              subtotalCents,
              deliveryFeeCents,
              serviceFeeCents: 0,
              discountCents: 0,
              taxCents: 0,
              totalCents: subtotalCents + deliveryFeeCents,
            },
            paymentMethod: {
              type: PaymentType.CASH,
              label: 'Cash on delivery',
              isDefault: true,
            },
            paymentStatus: PaymentStatus.PAID,
            placedAt,
            acceptedAt: new Date(placedAt.getTime() + 3 * 60 * 1000),
            preparingAt: new Date(placedAt.getTime() + 8 * 60 * 1000),
            readyAt: new Date(placedAt.getTime() + 22 * 60 * 1000),
            completedAt,
            statusHistory: [
              { status: OrderStatus.PENDING, at: placedAt },
              { status: OrderStatus.ACCEPTED, at: new Date(placedAt.getTime() + 3 * 60 * 1000) },
              { status: OrderStatus.PREPARING, at: new Date(placedAt.getTime() + 8 * 60 * 1000) },
              { status: OrderStatus.READY, at: new Date(placedAt.getTime() + 22 * 60 * 1000) },
              { status: OrderStatus.COMPLETED, at: completedAt },
            ],
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      if (!order) continue;

      const driver = drivers[(restaurantIndex + scenarioIndex) % Math.max(drivers.length, 1)];
      const delivery = await deliveryModel.findOneAndUpdate(
        { orderId: order._id },
        {
          $setOnInsert: {
            orderId: order._id,
            driverId: driver?._id ?? null,
            restaurantId: restaurant._id,
            customerId: customer._id,
            status: DeliveryStatus.DELIVERED,
            assignedAt: new Date(placedAt.getTime() + 22 * 60 * 1000),
            pickedUpAt: new Date(placedAt.getTime() + 28 * 60 * 1000),
            deliveredAt: completedAt,
            estimatedArrivalAt: completedAt,
            driverLocation: {
              lat: 35.523,
              lng: 35.779,
              updatedAt: completedAt,
            },
            assignmentHistory: driver
              ? [
                  {
                    action: 'ASSIGNED',
                    source: 'AUTOMATIC',
                    previousDriverId: null,
                    newDriverId: driver._id,
                    driverId: driver._id,
                    driverName: driver.phone || 'Savora driver',
                    at: new Date(placedAt.getTime() + 22 * 60 * 1000),
                  },
                ]
              : [],
            autoAssignment: {
              attempts: 1,
              lastAttemptAt: new Date(placedAt.getTime() + 22 * 60 * 1000),
              lastTrigger: 'ORDER_READY',
              status: driver ? 'ASSIGNED' : 'NO_ELIGIBLE_DRIVER',
            },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      if (delivery && !order.deliveryId) {
        await orderModel.updateOne({ _id: order._id }, { $set: { deliveryId: delivery._id } });
      }

      const reviewTargets = [
        {
          type: ReviewType.RESTAURANT,
          menuItemId: null,
          rating: scenario.rating,
          deliveryRating: null,
          serviceRating: null,
          comment: scenario.restaurantComment,
        },
        ...lineItems.map((item) => ({
          type: ReviewType.MENU_ITEM,
          menuItemId: item.productId,
          rating: scenario.rating,
          deliveryRating: null,
          serviceRating: null,
          comment: scenario.itemComment,
        })),
        {
          type: ReviewType.DELIVERY,
          menuItemId: null,
          rating: Math.round(((scenario.deliveryRating + scenario.serviceRating) / 2) * 100) / 100,
          deliveryRating: scenario.deliveryRating,
          serviceRating: scenario.serviceRating,
          comment: scenario.deliveryComment,
        },
      ];

      for (const target of reviewTargets) {
        await reviewModel.findOneAndUpdate(
          {
            orderId: order._id,
            type: target.type,
            menuItemId: target.menuItemId,
          },
          {
            $setOnInsert: {
              customerId: customer._id,
              restaurantId: restaurant._id,
              orderId: order._id,
              type: target.type,
              menuItemId: target.menuItemId,
              driverId: target.type === ReviewType.DELIVERY ? driver?._id ?? null : null,
              rating: target.rating,
              deliveryRating: target.deliveryRating,
              serviceRating: target.serviceRating,
              comment: target.comment,
            },
          },
          { upsert: true, setDefaultsOnInsert: true },
        );
      }
    }
  }

  // Rebuild every aggregate from the review rows so displayed ratings always
  // match the records a customer can read.
  for (const restaurant of restaurants) {
    const [summary] = await reviewModel.aggregate<{ average: number; total: number }>([
      {
        $match: {
          restaurantId: restaurant._id,
          type: ReviewType.RESTAURANT,
          status: 'visible',
        },
      },
      { $group: { _id: null, average: { $avg: '$rating' }, total: { $sum: 1 } } },
    ]);

    await restaurantModel.updateOne(
      { _id: restaurant._id },
      {
        $set: {
          rating: summary ? Math.round(summary.average * 100) / 100 : 0,
          reviewCount: summary?.total ?? 0,
        },
      },
    );
  }

  const restaurantIds = restaurants.map((restaurant) => restaurant._id);
  const reviewedItemIds = await reviewModel.distinct('menuItemId', {
    restaurantId: { $in: restaurantIds },
    type: ReviewType.MENU_ITEM,
    status: 'visible',
    menuItemId: { $ne: null },
  });

  await menuItemModel.updateMany(
    { restaurantId: { $in: restaurantIds }, _id: { $nin: reviewedItemIds } },
    { $set: { rating: 0, reviewCount: 0 } },
  );

  for (const menuItemId of reviewedItemIds) {
    const [summary] = await reviewModel.aggregate<{ average: number; total: number }>([
      { $match: { menuItemId, type: ReviewType.MENU_ITEM, status: 'visible' } },
      { $group: { _id: null, average: { $avg: '$rating' }, total: { $sum: 1 } } },
    ]);

    await menuItemModel.updateOne(
      { _id: menuItemId },
      {
        $set: {
          rating: summary ? Math.round(summary.average * 100) / 100 : 0,
          reviewCount: summary?.total ?? 0,
        },
      },
    );
  }

  for (const driver of drivers) {
    const [summary] = await reviewModel.aggregate<{ average: number }>([
      {
        $match: {
          driverId: driver._id,
          type: ReviewType.DELIVERY,
          status: 'visible',
          deliveryRating: { $ne: null },
        },
      },
      { $group: { _id: null, average: { $avg: '$deliveryRating' } } },
    ]);

    await driverModel.updateOne(
      { _id: driver._id },
      {
        $set: {
          rating: summary ? Math.round(summary.average * 100) / 100 : 5,
          completedDeliveries: await deliveryModel.countDocuments({
            driverId: driver._id,
            status: DeliveryStatus.DELIVERED,
          }),
        },
      },
    );
  }

  Logger.log(
    `Ensured demo order history and reviews for ${restaurants.length} restaurants.`,
    'Seed',
  );
}

async function main(): Promise<void> {
  setServers(['1.1.1.1', '8.8.8.8']);
  const customerPassword = requiredEnv('SEED_CUSTOMER_PASSWORD');
  const ownerPassword = requiredEnv('SEED_OWNER_PASSWORD');
  const driverPassword = requiredEnv('SEED_DRIVER_PASSWORD');
  const adminPassword = requiredEnv('SEED_ADMIN_PASSWORD');
  // Admins are provisioned only through the seed script, never through public
  // registration. Set SEED_ADMIN_EMAIL/SEED_ADMIN_NAME in the environment to
  // bootstrap the real operations account; the defaults keep local dev working.
  const adminEmail = optionalEnv('SEED_ADMIN_EMAIL', 'admin@example.com').toLowerCase();
  const adminName = optionalEnv('SEED_ADMIN_NAME', 'Priya Raman');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const usersService = app.get(UsersService);
    const restaurantsService = app.get(RestaurantsService);
    const driverModel = app.get<Model<DriverProfileDocument>>(
      getModelToken(DriverProfile.name),
    );
    const restaurantModel = app.get<Model<RestaurantDocument>>(
      getModelToken(Restaurant.name),
    );
    const categoryModel = app.get<Model<RestaurantCategoryDocument>>(
      getModelToken(RestaurantCategory.name),
    );
    const menuCategoryModel = app.get<Model<MenuCategoryDocument>>(
      getModelToken(MenuCategory.name),
    );
    const menuItemModel = app.get<Model<MenuItemDocument>>(getModelToken(MenuItem.name));
    const promotionModel = app.get<Model<PromotionDocument>>(getModelToken(Promotion.name));
    const orderModel = app.get<Model<OrderDocument>>(getModelToken(Order.name));
    const deliveryModel = app.get<Model<DeliveryDocument>>(getModelToken(Delivery.name));
    const reviewModel = app.get<Model<ReviewDocument>>(getModelToken(Review.name));

    await ensureCategories(categoryModel);

    const customer = await ensureAccount(usersService, {
      email: 'hasan@example.com',
      password: customerPassword,
      fullName: 'Hasan',
      role: UserRole.CUSTOMER,
      status: AccountStatus.APPROVED,
      phone: '+963 944 000 001',
    });
    await ensureCustomerExtras(customer, {
      line1: 'Approximate home location near Sheikh Daher',
      city: 'Latakia',
      state: 'Latakia',
      postalCode: '',
      country: 'Syria',
      coordinates: { lat: 35.523, lng: 35.779 },
    });

    const noah = await ensureAccount(usersService, {
      email: 'lama@example.com',
      password: customerPassword,
      fullName: 'Lama',
      role: UserRole.CUSTOMER,
      status: AccountStatus.APPROVED,
      phone: '+963 944 000 002',
    });
    await ensureCustomerExtras(noah, {
      line1: 'Approximate home location near Al-Raml Al-Janoubi',
      city: 'Latakia',
      state: 'Latakia',
      postalCode: '',
      country: 'Syria',
      coordinates: { lat: 35.507, lng: 35.774 },
    });

    const owner = await ensureAccount(usersService, {
      email: 'owner@example.com',
      password: ownerPassword,
      fullName: 'Elias Navarro',
      role: UserRole.RESTAURANT_OWNER,
      status: AccountStatus.APPROVED,
      phone: '+1 (718) 555-0188',
    });

    const ownerTwo = await ensureAccount(usersService, {
      email: 'owner2@example.com',
      password: ownerPassword,
      fullName: 'Priya Desai',
      role: UserRole.RESTAURANT_OWNER,
      status: AccountStatus.APPROVED,
      phone: '+1 (646) 555-0177',
    });

    await ensureAccount(usersService, {
      email: 'owner3@example.com',
      password: ownerPassword,
      fullName: 'Liam Chen',
      role: UserRole.RESTAURANT_OWNER,
      status: AccountStatus.PENDING_APPROVAL,
      phone: '+1 (917) 555-0110',
    });

    const demoDrivers = await Promise.all(
      [
        ['driver.hasan@example.com', 'Hasan Driver', '+963 944 000 101'],
        ['driver.lama@example.com', 'Lama Driver', '+963 944 000 102'],
        ['driver.latakia3@example.com', 'Latakia Driver 3', '+963 944 000 103'],
        ['driver.latakia4@example.com', 'Latakia Driver 4', '+963 944 000 104'],
        ['driver.latakia5@example.com', 'Latakia Driver 5', '+963 944 000 105'],
      ].map(([email, fullName, phone]) =>
        ensureAccount(usersService, {
          email,
          password: driverPassword,
          fullName,
          role: UserRole.DRIVER,
          status: AccountStatus.APPROVED,
          phone,
        }),
      ),
    );

    const adminAccount = await ensureAccount(usersService, {
      email: adminEmail,
      password: adminPassword,
      fullName: adminName,
      role: UserRole.ADMIN,
      status: AccountStatus.APPROVED,
      phone: '+1 (212) 555-0100',
    });

    // Older databases may have bootstrapped the operations email as a customer
    // through public registration. Reconcile the seeded administrator so the
    // documented admin login always lands on the operations dashboard.
    if (
      adminAccount.role !== UserRole.ADMIN ||
      adminAccount.accountStatus !== AccountStatus.APPROVED
    ) {
      adminAccount.role = UserRole.ADMIN;
      adminAccount.accountStatus = AccountStatus.APPROVED;
      await adminAccount.save();
      Logger.log(`Reconciled administrator account: ${adminEmail}`, 'Seed');
    }

    const admin = await usersService.findByEmail(adminEmail);

    const driverProfiles = [
      { serviceArea: 'Al-Ziraa', location: { lat: 35.515, lng: 35.790 } },
      { serviceArea: 'Sheikh Daher', location: { lat: 35.524, lng: 35.779 } },
      { serviceArea: 'Al-Azhari', location: { lat: 35.535, lng: 35.795 } },
      { serviceArea: 'Al-Raml Al-Janoubi', location: { lat: 35.507, lng: 35.774 } },
      { serviceArea: 'Daatour', location: { lat: 35.548, lng: 35.785 } },
    ];
    for (const [index, driver] of demoDrivers.entries()) {
      await ensureDriverProfile(driverModel, usersService, driver, {
      status: AccountStatus.APPROVED,
      availability: DriverAvailability.AVAILABLE,
      vehicle: index % 2 === 0 ? VehicleType.SCOOTER : VehicleType.BIKE,
      serviceArea: driverProfiles[index]?.serviceArea ?? 'Latakia',
      rating: 4.8,
      completedDeliveries: 0,
      totalEarningsCents: 0,
      location: driverProfiles[index]?.location,
      });
    }

    const ownerId = owner._id.toString();
    const ownerTwoId = ownerTwo._id.toString();
    const restaurants: RestaurantDocument[] = [];

    await restaurantModel.updateMany(
      { name: { $nin: DEMO_RESTAURANTS.map(({ name }) => name) }, status: RestaurantStatus.APPROVED },
      { $set: { status: RestaurantStatus.SUSPENDED, featured: false } },
    );

    for (const [index, seed] of DEMO_RESTAURANTS.entries()) {
      const restaurantOwnerId = index === 0 ? ownerId : ownerTwoId;
      restaurants.push(
        await ensureRestaurant(
          restaurantsService,
          restaurantModel,
          restaurantOwnerId,
          seed,
        ),
      );
    }

    for (const restaurant of restaurants) {
      await seedMenu(
        menuItemModel,
        menuCategoryModel,
        restaurant,
        DEMO_ITEMS_BY_RESTAURANT[restaurant.name] ?? [],
      );
    }

    if (restaurants[0]) {
      await usersService.attachRestaurant(ownerId, restaurants[0]._id.toString(), true);
    }
    if (restaurants[1]) {
      await usersService.attachRestaurant(ownerTwoId, restaurants[1]._id.toString(), true);
    }

    await ensurePromotions(promotionModel, admin?._id.toString());

    await seedDemoActivity({
      orderModel,
      deliveryModel,
      reviewModel,
      menuItemModel,
      driverModel,
      restaurantModel,
      customers: [customer, noah],
      restaurants,
    });

    Logger.log('Seed complete.', 'Seed');
    Logger.log(
      'Accounts: maya/noah/ava@example.com, owner/owner2/owner3@example.com, driver/driver2/driver3@example.com, admin.',
      'Seed',
    );
    Logger.log('Passwords are the values supplied in SEED_*_PASSWORD.', 'Seed');
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : String(error),
    error instanceof Error ? error.stack : undefined,
    'Seed',
  );
  process.exitCode = 1;
});
