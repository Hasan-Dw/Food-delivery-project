/**
 * Builds the public image library from Unsplash sources.
 *
 * Run `npm run assets` once (or after changing the manifest). Sources are
 * downloaded into a temporary folder, then cropped into WebP variants at
 * sensible widths so the app can serve responsive `srcset` images.
 *
 * Photos: Unsplash License (free for commercial and non-commercial use).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public', 'assets');
const SOURCE_DIR = path.join(os.tmpdir(), 'savora-asset-sources');

/** @typedef {{ key: string, id: string, folder: string, ratio: [number, number], alt: string, credit: string }} Asset */

/** @type {Asset[]} */
const assets = [
  // ── Hero & editorial ─────────────────────────────────────────────────────
  {
    key: 'hero-dining-table',
    id: '1424847651672-bf20a4b0982b',
    folder: 'banners',
    ratio: [4, 5],
    alt: 'An overhead table filled with shared dishes, fresh herbs and warm bread',
    credit: 'Unsplash',
  },
  {
    key: 'editorial-table',
    id: '1466978913421-dad2ebd01d17',
    folder: 'banners',
    ratio: [16, 10],
    alt: 'A long communal table laid with seasonal plates',
    credit: 'Unsplash',
  },
  {
    key: 'kitchen-craft',
    id: '1541557435984-1c79685a082b',
    folder: 'delivery',
    ratio: [4, 5],
    alt: 'A chef finishing a plate in a warm, softly lit kitchen',
    credit: 'Unsplash',
  },
  {
    key: 'kitchen-team',
    id: '1556910103-1c02745aae4d',
    folder: 'delivery',
    ratio: [3, 2],
    alt: 'Restaurant kitchen team preparing orders together',
    credit: 'Unsplash',
  },
  {
    key: 'delivery-courier',
    id: '1526367790999-0150786686a2',
    folder: 'delivery',
    ratio: [4, 5],
    alt: 'A delivery courier carrying a thermal backpack through the city',
    credit: 'Unsplash',
  },
  {
    key: 'delivery-spread',
    id: '1600891964599-f61ba0e24092',
    folder: 'delivery',
    ratio: [3, 2],
    alt: 'Freshly prepared dishes arranged for delivery',
    credit: 'Unsplash',
  },
  {
    key: 'auth-kitchen',
    id: '1517248135467-4c7edcad34c4',
    folder: 'banners',
    ratio: [4, 5],
    alt: 'A warmly lit restaurant dining room with set tables',
    credit: 'Unsplash',
  },
  {
    key: 'auth-table',
    id: '1504674900247-0877df9cc836',
    folder: 'banners',
    ratio: [4, 5],
    alt: 'A generous spread of grilled dishes and fresh sides',
    credit: 'Unsplash',
  },
  {
    key: 'auth-dessert',
    id: '1587314168485-3236d6710814',
    folder: 'banners',
    ratio: [4, 5],
    alt: 'A plated dessert finished with cream and berries',
    credit: 'Unsplash',
  },

  // ── Restaurants ──────────────────────────────────────────────────────────
  {
    key: 'restaurant-saffron-oak',
    id: '1550966871-3ed3cdb5ed0c',
    folder: 'restaurants',
    ratio: [16, 10],
    alt: 'Elegant dining room of Saffron & Oak with linen-set tables and soft daylight',
    credit: 'Unsplash',
  },
  {
    key: 'restaurant-nonna-lucia',
    id: '1414235077428-338989a2e8c0',
    folder: 'restaurants',
    ratio: [16, 10],
    alt: 'Bright neighbourhood trattoria Nonna Lucia with plants and marble tables',
    credit: 'Unsplash',
  },
  {
    key: 'restaurant-koji-sushi',
    id: '1590846406792-0adc7f938f1d',
    folder: 'restaurants',
    ratio: [16, 10],
    alt: 'Intimate sushi counter at Kōji Sushi lit by low pendant lamps',
    credit: 'Unsplash',
  },
  {
    key: 'restaurant-patty-club',
    id: '1514933651103-005eec06c04b',
    folder: 'restaurants',
    ratio: [16, 10],
    alt: 'Industrial bar seating inside The Patty Club',
    credit: 'Unsplash',
  },
  {
    key: 'restaurant-green-bowl',
    id: '1554118811-1e0d58224f24',
    folder: 'restaurants',
    ratio: [16, 10],
    alt: 'Light-filled dining room at Green Bowl Co. with pale wood furniture and plants',
    credit: 'Unsplash',
  },
  {
    key: 'restaurant-smoke-honey',
    id: '1559339352-11d035aa65de',
    folder: 'restaurants',
    ratio: [16, 10],
    alt: 'Moody dining room at Smoke & Honey with leather booths',
    credit: 'Unsplash',
  },
  {
    key: 'restaurant-casa-veracruz',
    id: '1559925393-8be0ec4767c8',
    folder: 'restaurants',
    ratio: [16, 10],
    alt: 'Street-side terrace of Casa Veracruz in the early evening',
    credit: 'Unsplash',
  },
  {
    key: 'restaurant-creme-crust',
    id: '1509440159596-0249088772ff',
    folder: 'restaurants',
    ratio: [16, 10],
    alt: 'Crème & Crust bakery counter filled with freshly baked bread',
    credit: 'Unsplash',
  },

  // ── Products ─────────────────────────────────────────────────────────────
  {
    key: 'dish-truffle-pizza',
    id: '1574071318508-1cdbab80d002',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Truffle mushroom pizza with melted cheese and fresh herbs',
    credit: 'Unsplash',
  },
  {
    key: 'dish-brisket',
    id: '1432139555190-58524dae6a55',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Slow-smoked brisket with charred vegetables',
    credit: 'Unsplash',
  },
  {
    key: 'dish-salmon-nigiri',
    id: '1579871494447-9811cf80d66c',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Salmon nigiri and maki rolls arranged on a dark ceramic plate',
    credit: 'Unsplash',
  },
  {
    key: 'dish-saffron-bowl',
    id: '1569718212165-3a8278d5f624',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Saffron chicken bowl with grains, greens and soft egg',
    credit: 'Unsplash',
  },
  {
    key: 'dish-smash-burger',
    id: '1553979459-d2229ba7433b',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Double smash burger with melted cheese and pickles',
    credit: 'Unsplash',
  },
  {
    key: 'dish-burrata',
    id: '1607532941433-304659e8198a',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Burrata with heirloom tomatoes, basil and olive oil',
    credit: 'Unsplash',
  },
  {
    key: 'dish-chicken-sandwich',
    id: '1521390188846-e2a3a97453a0',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Crispy chicken sandwich with slaw on toasted bread',
    credit: 'Unsplash',
  },
  {
    key: 'dish-green-goddess',
    id: '1512852939750-1305098529bf',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Green goddess bowl with avocado, grains and leafy greens',
    credit: 'Unsplash',
  },
  {
    key: 'dish-chipotle-salmon',
    id: '1467003909585-2f8a72700288',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Seared salmon with a smoky chipotle glaze and greens',
    credit: 'Unsplash',
  },
  {
    key: 'dish-tonkotsu',
    id: '1557872943-16a5ac26437e',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Tonkotsu ramen with soft egg, greens and sliced pork',
    credit: 'Unsplash',
  },
  {
    key: 'dish-chocolate-torte',
    id: '1578985545062-69928b1d9587',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Dark chocolate torte with cocoa dust and cream',
    credit: 'Unsplash',
  },
  {
    key: 'dish-pesto-rigatoni',
    id: '1551183053-bf91a1d81141',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Rigatoni tossed in bright green pesto with parmesan',
    credit: 'Unsplash',
  },
  {
    key: 'dish-butter-chicken',
    id: '1585937421612-70a008356fbe',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Creamy butter chicken served with rice and herbs',
    credit: 'Unsplash',
  },
  {
    key: 'dish-birria-tacos',
    id: '1551504734-5ee1c4a1479b',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Three birria tacos with lime, coriander and salsa',
    credit: 'Unsplash',
  },
  {
    key: 'dish-cookies',
    id: '1558961363-fa8fdf82db35',
    folder: 'products',
    ratio: [4, 3],
    alt: 'Freshly baked chocolate chip cookies on parchment',
    credit: 'Unsplash',
  },

  // ── Categories ───────────────────────────────────────────────────────────
  {
    key: 'category-burgers',
    id: '1594212699903-ec8a3eca50f5',
    folder: 'categories',
    ratio: [1, 1],
    alt: 'Stacked burger with fries and a drink',
    credit: 'Unsplash',
  },
  {
    key: 'category-pizza',
    id: '1513104890138-7c749659a591',
    folder: 'categories',
    ratio: [1, 1],
    alt: 'Pizza fresh from the oven with blistered crust',
    credit: 'Unsplash',
  },
  {
    key: 'category-sushi',
    id: '1553621042-f6e147245754',
    folder: 'categories',
    ratio: [1, 1],
    alt: 'Assorted sushi rolls on a wooden board',
    credit: 'Unsplash',
  },
  {
    key: 'category-fried-chicken',
    id: '1626082927389-6cd097cdc6ec',
    folder: 'categories',
    ratio: [1, 1],
    alt: 'Golden fried chicken in a paper basket',
    credit: 'Unsplash',
  },
  {
    key: 'category-desserts',
    id: '1563805042-7684c019e1cb',
    folder: 'categories',
    ratio: [1, 1],
    alt: 'Layered dessert with cream and berries',
    credit: 'Unsplash',
  },
  {
    key: 'category-healthy',
    id: '1546069901-ba9599a7e63c',
    folder: 'categories',
    ratio: [1, 1],
    alt: 'Colourful healthy bowl with grains and vegetables',
    credit: 'Unsplash',
  },
  {
    key: 'category-pasta',
    id: '1621996346565-e3dbc646d9a9',
    folder: 'categories',
    ratio: [1, 1],
    alt: 'Fresh pasta twirled with tomato sauce',
    credit: 'Unsplash',
  },
  {
    key: 'category-sandwiches',
    id: '1553909489-cd47e0907980',
    folder: 'categories',
    ratio: [1, 1],
    alt: 'Toasted sandwich cut in half with greens',
    credit: 'Unsplash',
  },

  // ── Banners & offers ─────────────────────────────────────────────────────
  {
    key: 'offer-table-spread',
    id: '1547592180-85f173990554',
    folder: 'banners',
    ratio: [16, 9],
    alt: 'Overhead spread of colourful bowls and shared plates',
    credit: 'Unsplash',
  },
  {
    key: 'offer-pizza-night',
    id: '1571407970349-bc81e7e96d47',
    folder: 'banners',
    ratio: [16, 9],
    alt: 'Pizza on a wooden board with a glass of wine',
    credit: 'Unsplash',
  },
  {
    key: 'offer-sweet-tooth',
    id: '1551024506-0bccd828d307',
    folder: 'banners',
    ratio: [16, 9],
    alt: 'Dessert table with cakes and pastries',
    credit: 'Unsplash',
  },
  {
    key: 'feature-koji-platter',
    id: '1611143669185-af224c5e3252',
    folder: 'banners',
    ratio: [4, 5],
    alt: 'Sushi platter prepared at Kōji Sushi',
    credit: 'Unsplash',
  },
  {
    key: 'feature-nonna-pasta',
    id: '1598866594230-a7c12756260f',
    folder: 'banners',
    ratio: [4, 5],
    alt: 'Handmade pasta plated at Nonna Lucia',
    credit: 'Unsplash',
  },
  {
    key: 'feature-saffron-plate',
    id: '1544025162-d76694265947',
    folder: 'banners',
    ratio: [4, 5],
    alt: 'Saffron & Oak seasonal plate',
    credit: 'Unsplash',
  },

  // ── People ───────────────────────────────────────────────────────────────
  {
    key: 'avatar-maya',
    id: '1494790108377-be9c29b29330',
    folder: 'people',
    ratio: [1, 1],
    alt: 'Portrait of Maya Bennett',
    credit: 'Unsplash',
  },
  {
    key: 'avatar-driver',
    id: '1500648767791-00dcc994a43e',
    folder: 'people',
    ratio: [1, 1],
    alt: 'Portrait of delivery partner Daniel Okafor',
    credit: 'Unsplash',
  },
  {
    key: 'avatar-diner-1',
    id: '1438761681033-6461ffad8d80',
    folder: 'people',
    ratio: [1, 1],
    alt: 'Portrait of a Savora customer',
    credit: 'Unsplash',
  },
  {
    key: 'avatar-diner-2',
    id: '1507003211169-0a1dd7228f2d',
    folder: 'people',
    ratio: [1, 1],
    alt: 'Portrait of a Savora customer',
    credit: 'Unsplash',
  },
  {
    key: 'avatar-diner-3',
    id: '1534528741775-53994a69daeb',
    folder: 'people',
    ratio: [1, 1],
    alt: 'Portrait of a Savora customer',
    credit: 'Unsplash',
  },
];

const TARGET_WIDTHS = {
  '16,10': [480, 900, 1400],
  '16,9': [640, 1100, 1600],
  '4,5': [480, 900, 1300],
  '4,3': [480, 900, 1300],
  '3,2': [480, 900, 1300],
  '1,1': [320, 600, 900],
};

const manifest = [];

await fs.mkdir(SOURCE_DIR, { recursive: true });

for (const asset of assets) {
  const ratioKey = asset.ratio.join(',');
  const widths = TARGET_WIDTHS[ratioKey] ?? [480, 900];
  const masterWidth = Math.max(...widths);
  const masterHeight = Math.round((masterWidth * asset.ratio[1]) / asset.ratio[0]);
  const sourcePath = path.join(SOURCE_DIR, `${asset.key}.jpg`);

  try {
    await fs.access(sourcePath);
  } catch {
    const url = `https://images.unsplash.com/photo-${asset.id}?w=${masterWidth}&h=${masterHeight}&fit=crop&crop=entropy&q=85&fm=jpg`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SavoraAssetBuilder/1.0' } });
    if (!res.ok) throw new Error(`Failed ${asset.key}: HTTP ${res.status}`);
    await fs.writeFile(sourcePath, Buffer.from(await res.arrayBuffer()));
    process.stdout.write(`↓ ${asset.key}\n`);
  }

  const folder = path.join(PUBLIC_DIR, asset.folder);
  await fs.mkdir(folder, { recursive: true });

  for (const width of widths) {
    const output = path.join(folder, `${asset.key}-${width}.webp`);
    await sharp(sourcePath)
      .resize({ width, height: Math.round((width * asset.ratio[1]) / asset.ratio[0]), fit: 'cover' })
      .webp({ quality: 78, effort: 5 })
      .toFile(output);
  }

  manifest.push({
    key: asset.key,
    folder: asset.folder,
    ratio: asset.ratio,
    widths,
    masterWidth,
    masterHeight,
    alt: asset.alt,
    credit: asset.credit,
  });
}

await fs.writeFile(
  path.join(ROOT, 'src', 'config', 'image-manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);

// Tiny blurred placeholders (one per asset) used for loading states.
const blurDir = path.join(PUBLIC_DIR, 'placeholders');
await fs.mkdir(blurDir, { recursive: true });
for (const asset of assets) {
  const sourcePath = path.join(SOURCE_DIR, `${asset.key}.jpg`);
  const buffer = await sharp(sourcePath).resize({ width: 24 }).blur(1.2).webp({ quality: 45 }).toBuffer();
  await fs.writeFile(path.join(blurDir, `${asset.key}.webp`), buffer);
}

console.log(`\n✓ ${assets.length} assets · ${manifest.length} manifest entries`);
