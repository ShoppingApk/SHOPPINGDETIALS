// Microphone / camera capture with voice-friendly settings and plain-language errors.

export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
};

export const VIDEO_CONSTRAINTS = {
  width: { ideal: 640 },
  height: { ideal: 360 },
  frameRate: { ideal: 24, max: 30 },
  facingMode: 'user',
};

export class MediaError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export function friendlyMediaError(err, device = 'microphone') {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    return new MediaError(
      `Permission to use your ${device} was denied. Allow it from the lock icon in the address bar (or in your phone's browser settings), then try again.`,
      'denied'
    );
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return new MediaError(`No ${device} was found on this device.`, 'missing');
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return new MediaError(`Your ${device} is being used by another app. Close that app (or another call) and try again.`, 'busy');
  }
  return new MediaError(`Could not start your ${device}.`, 'unknown');
}

export function mediaSupported() {
  return !!(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.RTCPeerConnection);
}

export async function getMicrophone() {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: false });
  } catch (err) {
    if (err?.name === 'OverconstrainedError') {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (e) {
        throw friendlyMediaError(e, 'microphone');
      }
    }
    throw friendlyMediaError(err, 'microphone');
  }
}

export async function getCamera(facingMode = 'user', deviceId) {
  const video = deviceId ? { ...VIDEO_CONSTRAINTS, facingMode: undefined, deviceId: { exact: deviceId } } : { ...VIDEO_CONSTRAINTS, facingMode };
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: false, video });
    return s.getVideoTracks()[0];
  } catch (err) {
    if (err?.name === 'OverconstrainedError' && !deviceId) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        return s.getVideoTracks()[0];
      } catch (e) {
        throw friendlyMediaError(e, 'camera');
      }
    }
    throw friendlyMediaError(err, 'camera');
  }
}

// Microphone (required) + camera (optional for video calls: falls back to audio only).
// Returns { stream, cameraError } where cameraError is a MediaError when the camera failed.
export async function getCallMedia(type) {
  if (!mediaSupported()) {
    throw new MediaError('Calls need a secure (https) page and an up-to-date browser.', 'unsupported');
  }
  const stream = await getMicrophone();
  let cameraError = null;
  if (type === 'video') {
    try {
      stream.addTrack(await getCamera('user'));
    } catch (err) {
      cameraError = err;
    }
  }
  return { stream, cameraError };
}

export function stopStream(stream) {
  stream?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* already stopped */
    }
  });
}

export async function listDevices(kind) {
  try {
    return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === kind);
  } catch {
    return [];
  }
}

export const canChooseOutput = () => typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
