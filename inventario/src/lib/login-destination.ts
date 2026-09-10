import type { AppRole } from './auth';

export function loginDestination(returnTo: unknown, role?: AppRole, standalone = false): string {
  const local = typeof returnTo === 'string' && returnTo.startsWith('/') &&
    !returnTo.startsWith('//') && !returnTo.includes('\\') && !/^\/login(?:[/?#]|$)/.test(returnTo);
  if (local && (role !== 'USER' || /^\/conferencia(?:[/?#]|$)/.test(returnTo))) return returnTo;
  return role === 'USER' || standalone ? '/conferencia' : '/';
}
