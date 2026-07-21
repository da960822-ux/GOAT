export interface RegionPalette {
  accent: string;
  bg: string;
  border: string;
  label: string;
  icon: string;
}

const REGION_MAP: Record<string, RegionPalette> = {
  동해안권: {
    accent: '#0284C7',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    label: '동해안',
    icon: 'wind',
  },
  고원권: {
    accent: '#15803D',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    label: '고원',
    icon: 'triangle',
  },
  영서권: {
    accent: '#4D7C0F',
    bg: '#F7FEE7',
    border: '#D9F99D',
    label: '영서',
    icon: 'feather',
  },
  북부내륙권: {
    accent: '#4338CA',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    label: '북부내륙',
    icon: 'cloud',
  },
};

const FALLBACK: RegionPalette = {
  accent: '#7C3AED',
  bg: '#F5F3FF',
  border: '#EDE9FE',
  label: '강원',
  icon: 'map-pin',
};

export function getRegionPalette(regionGroup: string): RegionPalette {
  return REGION_MAP[regionGroup] ?? FALLBACK;
}
