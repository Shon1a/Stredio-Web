/* Category-card artwork — a curated, STATIC backdrop per category tile.
 *
 * Each Categories-hub tile paints a single real backdrop behind its label. That
 * imagery is effectively static (the code always treated it as cacheable for
 * hours), so we bake in one hand-picked TMDB backdrop per category instead of
 * fetching it at runtime.
 *
 * Why it changed: the old hook fired ONE backend request per tile — 31
 * cross-origin, credentialed JSON round-trips (~750 KB, the genre catalog pages
 * alone ~34 KB each) just to pull a single image URL out of each. The artwork
 * couldn't even begin downloading until those calls resolved (and a cold Render
 * dyno stalled all of them). Now: zero API calls — the ~13 KB-avg w300 stills
 * load straight from TMDB's CDN as soon as the tile mounts.
 *
 * Each path below is a distinct backdrop drawn from that category's own feed
 * (greedy-unique so no two tiles share an image). To refresh, re-pick from the
 * live feeds and drop the new /file.jpg paths in. Rendered at w300 — the right
 * rendition for the ~150 px tiles even at 2× DPR, and ~½ the bytes of w500. */

const ART_BASE = 'https://image.tmdb.org/t/p/w300';

/** key (matches each tile's stable `key`) → TMDB backdrop path */
const CAT_ART: Record<string, string> = {
  // collections
  movies: '/mCpwRayjXMFzKHbjbzc5JRKfq1O.jpg',
  tv: '/577eXC8wFQT0eUrJcgznSiFPRmk.jpg',
  anime: '/j9fRIimor0AMFJR9kjZubXcABzZ.jpg',
  trending: '/m3Pom6pbD51bBv3syz8NMHda3fz.jpg',
  top: '/zfbjgQE1uSd9wiPTX4VzsLi0rGG.jpg',
  upcoming: '/sS3zGYFPcfM5pArVNWl6qLyaSmU.jpg',
  // genres
  action: '/1AVF2fAevpfi2HP6AEpptG1kg8R.jpg',
  adventure: '/qjTqY5coNiz6sVtPng40IzltsoN.jpg',
  comedy: '/c6U1Te0p0FK0BOB43hiwGlBKiVY.jpg',
  drama: '/Af907x5h9W1wVis8XrSd7ynTWuy.jpg',
  horror: '/r013C8Me2bZ0pUi0OWJRh0h7MzT.jpg',
  thriller: '/s6ly8laenkHWlIBRkLSfIuEMLC6.jpg',
  scifi: '/8Tfys3mDZVp4tNoH2ktm06a0Tau.jpg',
  fantasy: '/kxQiIJ4gVcD3K6o14MJ72p5yRcE.jpg',
  romance: '/1x9e0qWonw634NhIsRdvnneeqvN.jpg',
  animation: '/kkcwhgSFd81QDlXo8ytrpHPQjhy.jpg',
  mystery: '/s3tHm62ohyb0I5vSnPrpczCBtSX.jpg',
  crime: '/qJ2KSHJhlFvASBMLbGuP7OFMaFg.jpg',
  documentary: '/g961TJZSGL8RzWGwpFK3Us77SfM.jpg',
  family: '/zMwhWailP1WY7sb6AoE6b8ugoy.jpg',
  war: '/qVgZu5BTx6pu4owCvVOm4zjTfOi.jpg',
  western: '/Adrip2Jqzw56KeuV2nAxucKMNXA.jpg',
  history: '/apfyLCPVFttB8oXcsLJ7q0NSFLx.jpg',
  music: '/xBT0oNq6rsTFv4SxG5uGRIEOrq6.jpg',
  // networks
  netflix: '/jP0Rhj9OTPDAwQlHQwOLFDdeE8t.jpg',
  disney: '/jIArNHIekrCSVgdMbKPAXpPY03Y.jpg',
  prime: '/uTWhbLc7Bj4qNSdW3ZvZKL8cOHv.jpg',
  apple: '/9OQ5BIITkJwRJo9JA6AlCfJIGBQ.jpg',
  max: '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
  paramount: '/tUtXfyVy54BY7eJnRtI8Xnmr1ZL.jpg',
  crunchyroll: '/lthkKBLe1rX6iThgVFg22O02sJw.jpg',
};

/** The curated w300 backdrop URL for a category tile, or '' if none is set. */
export function catArt(key: string): string {
  const p = CAT_ART[key];
  return p ? ART_BASE + p : '';
}
