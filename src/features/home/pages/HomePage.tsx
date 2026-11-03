import { Hero } from '@/features/home/components/Hero';
import { Categories } from '@/features/home/sections/Categories';
import { DeliveryExperience } from '@/features/home/sections/DeliveryExperience';
import { FeaturedRestaurants } from '@/features/home/sections/FeaturedRestaurants';
import { FinalCta } from '@/features/home/sections/FinalCta';
import { HowItWorks } from '@/features/home/sections/HowItWorks';
import { Offers } from '@/features/home/sections/Offers';
import { PopularDishes } from '@/features/home/sections/PopularDishes';
import { PopularRestaurants } from '@/features/home/sections/PopularRestaurants';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Savora homepage: discovery, editorial picks, offers, delivery story and a
 * closing invitation. Every section reads from the service layer through
 * React Query; none of them fetches directly.
 */
export default function HomePage() {
  useDocumentTitle('Discover independent restaurants');

  return (
    <>
      <Hero />
      <Categories />
      <PopularRestaurants />
      <PopularDishes />
      <FeaturedRestaurants />
      <Offers />
      <DeliveryExperience />
      <HowItWorks />
      <FinalCta />
    </>
  );
}
