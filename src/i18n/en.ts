/* English is the offline fallback dictionary — every key the UI can request
 * resolves here if the active language file (loaded from the translations CDN)
 * is missing that key.
 *
 * EN_BASE is the full 481-key canonical table auto-extracted from the vanilla
 * assets/js/i18n.js (so keys align with the external stredio-translations repo).
 * SEED below carries the React app's additional/renamed keys and overrides base
 * where the wording was refined. Exported EN = { ...EN_BASE, ...SEED }. */
import { EN_BASE } from './en-base';

const SEED: Record<string, string> = {
  'brand.name': 'STREDIO',

  // primary nav (top strip + rail + drawer)
  'nav.home': 'Home',
  'nav.tv': 'TV',
  'nav.tv_shows': 'TV Shows',
  'nav.movies': 'Movies',
  'nav.new': 'New & Popular',
  'nav.new_popular': 'New & Popular',
  'nav.my_list': 'My List',
  'nav.mylist': 'My List',
  'nav.search': 'Search',
  'nav.anime': 'Anime',
  'nav.categories': 'Category',

  // Categories hub page
  'cathub.title': 'Browse by category',
  'cathub.sub': 'Jump straight into a collection, a genre, or a streaming service.',
  'cathub.collections': 'Collections',
  'cathub.genres': 'Genres',
  'cathub.networks': 'Networks',
  'nav.watch_head': 'WATCH',
  'nav.menu': 'BROWSE',
  'nav.catalog': 'Catalog',
  'nav.addons': 'Addons',
  'nav.settings': 'Settings',
  'nav.admin': 'Admin',
  'myspace.title': 'My Space',

  // ui chrome
  'ui.main_nav': 'Main navigation',
  'ui.aside_close': 'Close menu',
  'ui.nav_toggle_t': 'Toggle menu (\\)',
  'ui.nav_toggle_a': 'Toggle navigation menu',
  'ui.browse_catalog': 'Browse catalog',
  'ui.featured_title': 'Featured title',
  'ui.featured_titles': 'Featured titles',
  'ui.scroll_left': 'Scroll left',
  'ui.scroll_right': 'Scroll right',
  'ui.show': 'Show',

  // cards / rails
  'poster.view_details': 'view details',
  'type.movie': 'Movie',
  'type.series': 'Series',
  'cat.see_all': 'see all',
  'cat.browse_titles': 'browse titles',
  'cat.back': 'Back',
  'continue.remove': 'Remove from Continue Watching',

  // home row titles
  'sec.trending_movies': 'Trending Movies',
  'sec.trending_shows': 'Trending Shows',
  'sec.top_movies': 'Top Rated Movies',
  'sec.top_shows': 'Top Rated Shows',
  'sec.trending_anime': 'Trending Anime',
  'sec.top_anime': 'Top Rated Anime',
  'sec.netflix': 'Netflix',
  'sec.disney': 'Disney+',
  'sec.prime': 'Prime Video',
  'sec.apple': 'Apple TV+',
  'sec.max': 'HBO Max',
  'sec.paramount': 'Paramount+',
  'sec.crunchyroll': 'Crunchyroll',
  'sec.studios': 'Studios',
  'sec.upcoming_movies': 'Upcoming Movies',

  // hero actions
  'hero.play': 'MORE',
  'hero.more_info': 'More Info',
  'hero.add': 'My List',
  'hero.plot_fallback': '',

  // footer
  'footer.disclaimer':
    'STREDIO hosts no video files and stores no media on its servers. The catalog shows descriptive metadata only; any playable sources come from third-party add-ons you install, and your browser connects to them directly.',
  'footer.terms_link': 'Terms & Conditions',
  'footer.legal_link': 'DMCA / Takedown Policy',

  // detail modal
  'modal.now_showing': 'NOW SHOWING',
  'modal.now_streaming': 'NOW STREAMING',
  'modal.watch': 'WATCH',
  'modal.watch_authed': 'WATCH',
  'modal.resume': 'RESUME',
  'modal.close_aria': 'Close details',
  'modal.unmute': 'Unmute trailer',
  'modal.mute': 'Mute trailer',
  'modal.loading_synopsis': 'Loading synopsis…',
  'modal.no_synopsis': 'No synopsis available.',
  'modal.synopsis_unavailable': 'Synopsis unavailable.',
  'modal.episodes': 'EPISODES',
  'modal.streams': 'SOURCES',
  'modal.cast_credits': 'CASTS & CREDITS',
  'modal.show_all': 'SHOW ALL',
  'modal.show_less': 'SHOW LESS',
  'modal.director': 'Director',
  'modal.creator': 'Creator',
  'modal.as': 'as {name}',
  'modal.you_may_like': 'You may like',
  'modal.pick_episode': 'Pick an episode to see sources.',
  'modal.no_streams': 'No sources yet — install a streaming add-on to play.',
  'modal.signin_addon': 'Sign in to install your add-on.',
  'modal.tab_streaming': 'Streaming Services',
  'modal.tab_addons': 'Addon Sources',
  'modal.watch_on': 'Watch on {name}',
  'modal.no_providers': 'No streaming services listed for this title.',
  // A COUNT, not an ordinal — DetailModal renders it as "1 Season · 10 Episodes" when
  // meta.seasons === 1, pairing with 'modal.seasons_count' ("{n} Seasons"). Do not
  // "align" it with 'modal.season' below: that one IS an ordinal, for the season tabs.
  // ka.json has this right ("1 სეზონი" = 1 season), so English was the odd one out.
  'modal.season_one': '1 Season',
  'modal.season': 'Season {n}',
  'modal.seasons_count': '{n} Seasons',
  'modal.episodes_count': '{n} Episodes',
  'modal.episode_n': 'Episode {n}',
  'modal.episodes_unavailable': 'Episodes unavailable.',
  'modal.trailer_title': 'Trailer: {title}',
  'mylist.add': 'Add to My List',
  'mylist.remove': 'Remove from My List',

  // video player
  'player.preparing': 'Preparing stream…',
  'player.close': 'Close player',
  'ctl.play_a': 'Play or pause',
  'ctl.back_a': 'Back 10 seconds',
  'ctl.fwd_a': 'Forward 10 seconds',
  'ctl.mute_a': 'Mute',
  'ctl.vol_a': 'Volume',
  'ctl.subs_a': 'Toggle subtitles',
  'ctl.settings_a': 'Playback settings',
  'ctl.pip_a': 'Picture in picture',
  'ctl.fs_a': 'Toggle fullscreen',
  'ctl.speed': 'Speed',
  'ctl.quality': 'Quality',
  'ctl.subtitles': 'Subtitles',
  'ctl.auto': 'Auto',
  'ctl.off': 'Off',
  'ctl.on': 'On',
  'ctl.normal': 'Normal',
  'ctl.enhance': 'Picture enhance',
  'ctl.grain': 'Grain',
  'ctl.clarity': 'Clarity',

  // discover / search / grid
  'search.ph': 'Search titles, people, genres…',
  'search.aria': 'Search titles, people, and genres',
  'filter.type': 'TYPE',
  'filter.all': 'All',
  'filter.movies': 'Movies',
  'filter.series': 'Series',
  'filter.genre': 'GENRE',
  'filter.year': 'YEAR',
  'filter.rating': 'RATING',
  'filter.clear': 'Clear all ✕',
  'filter.any_year': 'any year',
  'filter.any_rating': 'any rating',
  'grid.load_more': 'Load more',
  'grid.loading': 'Loading…',
  'grid.no_results': 'No results for “{q}”.',
  'grid.no_titles': 'No titles found.',
  'cat.page': 'Page {x} of {y}',
  'cat.results': 'Results for “{q}”',
  'cat.filtered': 'Filtered titles',
  'explore.results': 'Results for “{q}”',
  'explore.trending': 'Trending now',

  // continue watching
  'sec.continue': 'Continue Watching',

  // my space / my list
  'mylist.empty': 'Your list is empty. Add titles with the + button.',
  'myspace.my_list': 'My List',

  // settings
  'settings.title': 'Settings',
  'settings.interface': 'Interface',
  'settings.language': 'Language',
  'settings.playback': 'Playback',
  'settings.autoplay_next': 'Auto-play next episode',
  'settings.subtitles': 'Subtitles',
  'settings.sub_size': 'Subtitle size',
  'settings.blur_unwatched': 'Blur unwatched episode stills',
  'settings.sub_preview': 'The quick brown fox',

  // addons
  'addons.title': 'Add-ons',
  'addons.official': 'Official add-ons',
  'addons.community': 'Community add-ons',
  'addons.install_ph': 'Paste an add-on manifest URL…',
  'addons.install': 'Install',
  'addons.installed': 'Installed',
  'addons.none': 'No community add-ons yet.',
  'addons.sync_note': 'Signed in? Your add-ons sync across your devices.',
  'addons.configure': 'Configure',
  'addons.enable': 'Add',
  'addons.remove': 'Remove',
  'addons.on': 'On',

  // auth
  'auth.kicker': '// sign in to manage add-ons & settings',
  'auth.tab_login': 'LOG IN',
  'auth.tab_signup': 'SIGN UP',
  'auth.or': 'or',
  'auth.name': 'FIRST NAME',
  'auth.surname': 'SURNAME',
  'auth.dob': 'DATE OF BIRTH',
  'auth.email': 'EMAIL',
  'auth.password': 'PASSWORD',
  'auth.show': 'SHOW',
  'auth.hide': 'HIDE',
  'auth.pass_hint': 'min 8 characters · 1 letter · 1 number',
  'auth.login_cta': 'LOG IN ▶',
  'auth.signup_cta': 'CREATE ACCOUNT ▶',
  'auth.switch_no_account': 'No account?',
  'auth.switch_have_account': 'Already have an account?',
  'auth.create_one': 'Create one →',
  'auth.login_link': 'Log in →',
  'auth.note': 'Browsing the catalog stays open — sign in only to install add-ons.',
  'auth.dismiss_aria': 'Close and keep browsing the catalog',
  'auth.err_email': 'Enter a valid email address.',
  'auth.err_pass': 'Password must be at least 8 characters with a letter and a number.',
  'auth.err_age': 'You must be at least 13 years old.',
  'auth.err_generic': 'Something went wrong. Please try again.',
  'auth.signin': 'Sign in',
  'auth.logout': 'Log out',
  'auth.account': 'Account',

  'common.loading': 'Loading…',
};

export const EN: Record<string, string> = { ...EN_BASE, ...SEED };
