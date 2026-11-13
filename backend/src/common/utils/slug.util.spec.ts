import { toSlug } from './slug.util';

describe('toSlug', () => {
  it('normalises names into URL-safe slugs', () => {
    expect(toSlug('Saffron & Oak')).toBe('saffron-oak');
    expect(toSlug('  Café  Nöel  ')).toBe('cafe-noel');
    expect(toSlug('The Patty Club!')).toBe('the-patty-club');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(toSlug('***')).toBe('');
  });
});
