export type PublicRoute =
  | { type: 'profile'; id: string }
  | { type: 'set'; id: string };

export function getPublicRouteFromLocation(pathname: string): PublicRoute | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  if (parts[0] === 'profile') return { type: 'profile', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'sets') return { type: 'set', id: decodeURIComponent(parts[1]) };
  return null;
}
