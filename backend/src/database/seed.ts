import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
import {
  type Address,
  type PaymentMethod,
  type UserDocument,
} from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';

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
      postalCode: extras.postalCode ?? '11211',
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
      },
    },
  );
}

async function ensureRestaurant(
  restaurantsService: RestaurantsService,
  restaurantModel: Model<RestaurantDocument>,
  ownerId: string,
  seed: SeedRestaurant,
): Promise<RestaurantDocument> {
  const existing = await restaurantModel.findOne({ name: seed.name });
  if (existing) {
    Logger.log(`Restaurant already exists: ${seed.name}`, 'Seed');
    return existing;
  }

  const created = await restaurantsService.createForOwner(
    ownerId,
    {
      name: seed.name,
      tagline: seed.tagline,
      cuisines: seed.cuisines,
      categorySlugs: seed.categorySlugs,
      imageKey: seed.imageKey,
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
    },
    RestaurantStatus.APPROVED,
  );

  const document = await restaurantModel.findByIdAndUpdate(
    created.id,
    {
      $set: {
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

  const operations = items.map((item) => {
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
            imageKey: item.imageKey,
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

    await ensureCategories(categoryModel);

    const customer = await ensureAccount(usersService, {
      email: 'maya@example.com',
      password: customerPassword,
      fullName: 'Maya Chen',
      role: UserRole.CUSTOMER,
      status: AccountStatus.APPROVED,
      phone: '+1 (718) 555-0142',
      preferences: {
        dietary: ['vegetarian'],
        emailReceipts: true,
        orderUpdates: true,
        marketing: true,
      },
    });
    await ensureCustomerExtras(customer);

    const noah = await ensureAccount(usersService, {
      email: 'noah@example.com',
      password: customerPassword,
      fullName: 'Noah Kim',
      role: UserRole.CUSTOMER,
      status: AccountStatus.APPROVED,
      phone: '+1 (917) 555-0172',
      preferences: {
        dietary: [],
        emailReceipts: true,
        orderUpdates: true,
        marketing: false,
      },
    });
    await ensureCustomerExtras(noah, {
      line1: '76 Grand Street',
      line2: 'Floor 2',
      city: 'New York',
      state: 'NY',
      postalCode: '10013',
      instructions: 'Leave with the front desk.',
      coordinates: { lat: 40.7189, lng: -74.0021 },
      cardLast4: '1881',
    });

    const ava = await ensureAccount(usersService, {
      email: 'ava@example.com',
      password: customerPassword,
      fullName: 'Ava Patel',
      role: UserRole.CUSTOMER,
      status: AccountStatus.APPROVED,
      phone: '+1 (646) 555-0129',
      preferences: {
        dietary: ['vegan'],
        emailReceipts: true,
        orderUpdates: true,
        marketing: true,
      },
    });
    await ensureCustomerExtras(ava, {
      line1: '320 Atlantic Avenue',
      line2: 'Apt 5C',
      city: 'Brooklyn',
      state: 'NY',
      postalCode: '11201',
      instructions: 'Call on arrival. No contact delivery preferred.',
      coordinates: { lat: 40.6912, lng: -73.9865 },
      cardLast4: '3320',
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

    const driver = await ensureAccount(usersService, {
      email: 'driver@example.com',
      password: driverPassword,
      fullName: 'Sam Rivera',
      role: UserRole.DRIVER,
      status: AccountStatus.APPROVED,
      phone: '+1 (917) 555-0119',
    });

    const driverTwo = await ensureAccount(usersService, {
      email: 'driver2@example.com',
      password: driverPassword,
      fullName: 'Aisha Bell',
      role: UserRole.DRIVER,
      status: AccountStatus.APPROVED,
      phone: '+1 (347) 555-0183',
    });

    const driverThree = await ensureAccount(usersService, {
      email: 'driver3@example.com',
      password: driverPassword,
      fullName: 'Marco Silva',
      role: UserRole.DRIVER,
      status: AccountStatus.PENDING_APPROVAL,
      phone: '+1 (929) 555-0148',
    });

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

    await ensureDriverProfile(driverModel, usersService, driver, {
      status: AccountStatus.APPROVED,
      availability: DriverAvailability.AVAILABLE,
      vehicle: VehicleType.SCOOTER,
      serviceArea: 'All boroughs',
      rating: 4.92,
      completedDeliveries: 128,
      totalEarningsCents: 96450,
    });

    await ensureDriverProfile(driverModel, usersService, driverTwo, {
      status: AccountStatus.APPROVED,
      availability: DriverAvailability.AVAILABLE,
      vehicle: VehicleType.BIKE,
      serviceArea: 'Brooklyn and Lower Manhattan',
      rating: 4.87,
      completedDeliveries: 76,
      totalEarningsCents: 58300,
    });

    await ensureDriverProfile(driverModel, usersService, driverThree, {
      status: AccountStatus.PENDING_APPROVAL,
      availability: DriverAvailability.OFFLINE,
      vehicle: VehicleType.CAR,
      serviceArea: 'Queens and Brooklyn',
      rating: 5,
      completedDeliveries: 0,
      totalEarningsCents: 0,
      approvedAt: new Date('2024-01-01T00:00:00.000Z'),
    });

    const ownerId = owner._id.toString();
    const ownerTwoId = ownerTwo._id.toString();
    const restaurants: RestaurantDocument[] = [];

    for (const [index, seed] of RESTAURANTS.entries()) {
      // The first four kitchens belong to the original owner; the newest two
      // belong to a second approved owner so ownership scoping has real data.
      const restaurantOwnerId = index < 4 ? ownerId : ownerTwoId;
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
        ITEMS_BY_RESTAURANT[restaurant.name] ?? [],
      );
    }

    if (restaurants[0]) {
      await usersService.attachRestaurant(ownerId, restaurants[0]._id.toString());
    }
    if (restaurants[4]) {
      await usersService.attachRestaurant(ownerTwoId, restaurants[4]._id.toString());
    }

    await ensurePromotions(promotionModel, admin?._id.toString());

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
