import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ServiceArea {
  id: string;
  city: string;
  region: string;
  postalCode: string;
  eta: string;
}

/**
 * Savora operates in Latakia only. These neighbourhoods are display-level
 * delivery zones; every one resolves to the same Latakia catalog on the API.
 */
export const serviceAreas: ServiceArea[] = [
  { id: 'area_sheikh_daher', city: 'Latakia', region: 'Sheikh Daher', postalCode: '', eta: '20–30 min' },
  { id: 'area_al_raml', city: 'Latakia', region: 'Al-Raml Al-Janoubi', postalCode: '', eta: '25–35 min' },
  { id: 'area_al_ziraa', city: 'Latakia', region: 'Al-Ziraa', postalCode: '', eta: '25–35 min' },
  { id: 'area_corniche', city: 'Latakia', region: 'Corniche', postalCode: '', eta: '30–40 min' },
];

export const SERVICE_AREA_CITY = 'Latakia';
export const SERVICE_AREA_COUNTRY = 'Syria';

/** Coordinates for the Latakia city centre, used as the default map view. */
export const LATAKIA_CENTER = { lat: 35.5196, lng: 35.7915 } as const;

export const LATAKIA_BOUNDS = {
  south: 35.42,
  north: 35.62,
  west: 35.68,
  east: 35.88,
} as const;

interface LocationState {
  areaId: string;
  setArea: (areaId: string) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      areaId: serviceAreas[0].id,
      setArea: (areaId) => set({ areaId }),
    }),
    {
      name: 'savora-location',
      partialize: (state) => ({ areaId: state.areaId }),
    },
  ),
);

export function useSelectedArea(): ServiceArea {
  const areaId = useLocationStore((state) => state.areaId);
  return serviceAreas.find((area) => area.id === areaId) ?? serviceAreas[0];
}
