// Only allow post-login redirects to in-app paths (blocks "//evil.com" style open redirects).
export const safeFrom = (from) =>
  typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null;
