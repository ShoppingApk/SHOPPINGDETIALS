import api, { unwrap } from './client';

// The only private-messaging call in the main bundle. The server compares the keyword in
// constant time. Resolves to true only for a chatuser who sent the right keyword.
export const unlockChat = (keyword) =>
  api.post('/chat/unlock', { keyword }).then((r) => unwrap(r)?.unlocked === true);
