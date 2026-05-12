const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);

function resolvePageUrl(path, hash = '') {
  const url = new URL(path, appBaseUrl);

  if (hash) {
    url.hash = hash.startsWith('#') ? hash : `#${hash}`;
  }

  return url.toString();
}

export const pageUrls = Object.freeze({
  home: appBaseUrl.toString(),
  userPortal: resolvePageUrl('src/pages/user-portal.html'),
  teams: resolvePageUrl('src/pages/teams.html'),
  controlCenter: resolvePageUrl('src/pages/control-center.html'),
  police: resolvePageUrl('src/pages/police.html'),
  medical: resolvePageUrl('src/pages/active-dispatches.html'),
  restaurant: resolvePageUrl('src/pages/restaurant.html'),
  miniGame: resolvePageUrl('src/pages/mini-game.html')
});

export function userPortalUrl(hash = '') {
  return resolvePageUrl('src/pages/user-portal.html', hash);
}