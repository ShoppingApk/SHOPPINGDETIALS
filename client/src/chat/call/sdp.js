// Opus tuning for voice: in-band FEC (recovers lost packets), DTX (saves data in silence),
// mono, ~36 kbps. These fmtp parameters tell the OTHER side how to encode what it sends us,
// so both peers apply them to their own descriptions.
export const OPUS_BITRATE = 36000;

const OPUS_PARAMS = {
  minptime: '10',
  useinbandfec: '1',
  usedtx: '1',
  stereo: '0',
  'sprop-stereo': '0',
  maxaveragebitrate: String(OPUS_BITRATE),
  maxplaybackrate: '48000',
  cbr: '0',
};

export function tuneOpus(sdp) {
  if (typeof sdp !== 'string') return sdp;
  const eol = sdp.includes('\r\n') ? '\r\n' : '\n';
  const rtpmap = sdp.match(/a=rtpmap:(\d+) opus\/48000(\/2)?/i);
  if (!rtpmap) return sdp;
  const pt = rtpmap[1];
  const fmtpRe = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`);

  const build = (existing = '') => {
    const params = new Map();
    existing
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => {
        const i = p.indexOf('=');
        params.set(i < 0 ? p : p.slice(0, i), i < 0 ? '' : p.slice(i + 1));
      });
    Object.entries(OPUS_PARAMS).forEach(([k, v]) => params.set(k, v));
    return `a=fmtp:${pt} ${[...params].map(([k, v]) => (v === '' ? k : `${k}=${v}`)).join(';')}`;
  };

  if (fmtpRe.test(sdp)) return sdp.replace(fmtpRe, (_, existing) => build(existing));
  return sdp.replace(rtpmap[0], `${rtpmap[0]}${eol}${build()}`);
}
