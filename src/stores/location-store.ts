import { create } from 'zustand';

export interface ServiceArea {
  id: string;
  city: string;
  region: string;
  postalCode: string;
  eta: string;
}

export const serviceAreas: ServiceArea[] = [
  { id: 'area_brooklyn', city: 'Brooklyn', region: 'NY', postalCode: '11217', eta: '25–35 min' },
  { id: 'area_manhattan', city: 'Manhattan', region: 'NY', postalCode: '10002', eta: '30–40 min' },
  { id: 'area_queens', city: 'Queens', region: 'NY', postalCode: '11101', eta: '35–45 min' },
  { id: 'area_jersey', city: 'Jersey City', region: 'NJ', postalCode: '07302', eta: '35–45 min' },
];

interface LocationState {
  areaId: string;
  setArea: (areaId: string) => void;
}

export const useLocationStore = create<LocationState>()((set) => ({
  areaId: 'area_brooklyn',
  setArea: (areaId) => set({ areaId }),
}));

export function useSelectedArea(): ServiceArea {
  const areaId = useLocationStore((state) => state.areaId);
  return serviceAreas.find((area) => area.id === areaId) ?? serviceAreas[0];
}
