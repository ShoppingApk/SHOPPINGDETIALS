// One WebRTC peer connection for a 1:1 call.
//  - "Perfect negotiation": the caller is impolite, the callee polite, so offer collisions
//    (e.g. both sides restarting ICE at once) resolve themselves.
//  - ICE candidates that arrive before the remote description are queued.
//  - Audio is protected first: Opus FEC/DTX, high send priority; video adapts (bitrate /
//    resolution, then pauses) from getStats() every 2 s, and never touches the audio sender.
//  - Automatic ICE restart on disconnect/failure/network change; gives up after ~30 s.
// Never logs SDP, candidates or media.
import { tuneOpus, OPUS_BITRATE } from './sdp';

const DEV = import.meta.env.DEV;
const log = (...a) => DEV && console.debug('[call]', ...a); // states only, never SDP/ICE

const STATS_EVERY_MS = 2000;
const CONNECT_TIMEOUT_MS = 25_000; // first connection
const RECONNECT_GIVE_UP_MS = 30_000;
const MAX_RESTARTS = 5;

// Video send levels. The last one pauses video (audio keeps going).
export const VIDEO_LEVELS = [
  { maxBitrate: 800_000, scale: 1 },
  { maxBitrate: 450_000, scale: 1.5 },
  { maxBitrate: 180_000, scale: 2 },
  { paused: true },
];

export default class CallSession {
  /**
   * @param {object} o
   * @param {boolean} o.polite          callee = true, caller = false
   * @param {'audio'|'video'} o.type
   * @param {RTCIceServer[]} o.iceServers
   * @param {MediaStream} o.localStream
   * @param {(event, data) => void} o.signal          sends call:offer / answer / ice-candidate / media-state
   * @param {(patch) => void} o.onChange              connection, quality, remote stream, video level
   * @param {() => Promise<RTCIceServer[]>} o.refreshIce  fresh TURN credentials for restarts
   */
  constructor({ polite, type, iceServers, localStream, signal, onChange, refreshIce }) {
    this.polite = polite;
    this.type = type;
    this.localStream = localStream;
    this.signal = signal;
    this.onChange = onChange;
    this.refreshIce = refreshIce;

    this.makingOffer = false;
    this.ignoreOffer = false;
    this.pendingCandidates = [];
    this.queue = Promise.resolve(); // incoming descriptions/candidates are handled in order
    this.closed = false;
    this.everConnected = false;
    this.restarts = 0;
    this.lostSince = 0;
    this.timers = {};
    this.videoLevel = 0;
    this.goodStreak = 0;
    this.badStreak = 0;
    this.prev = {};
    this.remoteStream = new MediaStream();

    const pc = new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require', iceCandidatePoolSize: 2 });
    this.pc = pc;

    pc.ontrack = ({ track }) => {
      if (!this.remoteStream.getTracks().includes(track)) this.remoteStream.addTrack(track);
      track.onunmute = () => this.onChange({ remoteTracks: Date.now() });
      track.onmute = () => this.onChange({ remoteTracks: Date.now() });
      track.onended = () => {
        this.remoteStream.removeTrack(track);
        this.onChange({ remoteTracks: Date.now() });
      };
      this.onChange({ remoteStream: this.remoteStream, remoteTracks: Date.now() });
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.signal('call:ice-candidate', { candidate: candidate.toJSON() });
    };
    pc.onnegotiationneeded = () => this.negotiate();
    pc.oniceconnectionstatechange = () => this.onIceState();
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') this.onIceState(true);
    };

    // The caller creates the transceivers (and so sends the first offer). The callee attaches
    // its tracks to the transceivers created by that offer, so no extra negotiation is needed.
    if (!polite) {
      const audio = localStream.getAudioTracks()[0];
      pc.addTransceiver(audio || 'audio', { direction: 'sendrecv', streams: [localStream] });
      if (type === 'video') {
        const video = localStream.getVideoTracks()[0];
        pc.addTransceiver(video || 'video', { direction: 'sendrecv', streams: [localStream] });
      }
    }

    this.timers.connect = setTimeout(() => {
      if (!this.everConnected && !this.closed) this.setConnection('failed');
    }, CONNECT_TIMEOUT_MS);

    this.onOnline = () => this.networkChanged('online');
    this.onOffline = () => this.everConnected && this.setConnection('reconnecting');
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    this.netInfo = navigator.connection;
    this.onNetInfo = () => this.networkChanged('network-change');
    this.netInfo?.addEventListener?.('change', this.onNetInfo);
  }

  // ---------- negotiation ----------

  async negotiate() {
    if (this.closed) return;
    try {
      this.makingOffer = true;
      const offer = await this.pc.createOffer();
      if (this.pc.signalingState !== 'stable' || this.closed) return;
      await this.pc.setLocalDescription({ type: 'offer', sdp: tuneOpus(offer.sdp) });
      this.signal('call:offer', { description: { type: 'offer', sdp: this.pc.localDescription.sdp } });
    } catch (err) {
      log('negotiate failed', err?.name);
    } finally {
      this.makingOffer = false;
    }
  }

  handleDescription(description) {
    this.queue = this.queue.then(() => this.applyDescription(description)).catch((err) => log('description failed', err?.name));
    return this.queue;
  }

  async applyDescription(description) {
    if (this.closed) return;
    const pc = this.pc;
    const collision = description.type === 'offer' && (this.makingOffer || pc.signalingState !== 'stable');
    this.ignoreOffer = !this.polite && collision;
    if (this.ignoreOffer) return;

    await pc.setRemoteDescription(description); // rolls back our own offer if needed (polite side)
    if (description.type === 'offer') {
      this.attachLocalTracks();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription({ type: 'answer', sdp: tuneOpus(answer.sdp) });
      this.signal('call:answer', { description: { type: 'answer', sdp: pc.localDescription.sdp } });
    }
    const queued = this.pendingCandidates.splice(0);
    for (const c of queued) await this.addCandidate(c);
    this.tuneSenders();
  }

  // Callee: put our microphone/camera on the transceivers the caller's offer created.
  attachLocalTracks() {
    for (const t of this.pc.getTransceivers()) {
      const kind = t.receiver.track?.kind;
      if (!kind || t.sender.track) continue;
      const track = kind === 'audio' ? this.localStream.getAudioTracks()[0] : this.localStream.getVideoTracks()[0];
      if (track) t.sender.replaceTrack(track).catch(() => {});
      try {
        t.direction = 'sendrecv';
      } catch {
        /* stopped transceiver */
      }
    }
  }

  handleCandidate(candidate) {
    if (!candidate) return;
    this.queue = this.queue.then(() => {
      if (this.closed) return undefined;
      if (!this.pc.remoteDescription) {
        this.pendingCandidates.push(candidate);
        return undefined;
      }
      return this.addCandidate(candidate);
    });
  }

  async addCandidate(candidate) {
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (err) {
      if (!this.ignoreOffer) log('candidate rejected', err?.name);
    }
  }

  // ---------- senders ----------

  senderOf(kind) {
    return this.pc.getTransceivers().find((t) => (t.sender.track?.kind || t.receiver.track?.kind) === kind)?.sender;
  }

  async setEncoding(sender, patch) {
    if (!sender) return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || !params.encodings.length) params.encodings = [{}];
      Object.assign(params.encodings[0], patch);
      await sender.setParameters(params);
    } catch {
      // Some browsers reject priority fields: retry with the essentials only.
      try {
        const params = sender.getParameters();
        if (!params.encodings || !params.encodings.length) return;
        const { priority, networkPriority, ...rest } = patch;
        Object.assign(params.encodings[0], rest);
        await sender.setParameters(params);
      } catch {
        /* not supported: defaults are fine */
      }
    }
  }

  async tuneSenders() {
    if (this.closed) return;
    await this.setEncoding(this.senderOf('audio'), { priority: 'high', networkPriority: 'high', maxBitrate: OPUS_BITRATE + 8000 });
    if (this.type === 'video') await this.applyVideoLevel();
  }

  async applyVideoLevel() {
    const level = VIDEO_LEVELS[this.videoLevel];
    const sender = this.senderOf('video');
    if (!sender) return;
    if (level.paused) {
      await this.setEncoding(sender, { active: false });
    } else {
      await this.setEncoding(sender, { active: true, priority: 'low', networkPriority: 'low', maxBitrate: level.maxBitrate, scaleResolutionDownBy: level.scale });
    }
  }

  // Camera on/off/switch: replace the outgoing video track without renegotiating.
  async replaceVideoTrack(track) {
    const sender = this.senderOf('video');
    if (sender) await sender.replaceTrack(track || null);
    if (track) await this.applyVideoLevel();
  }

  async replaceAudioTrack(track) {
    const sender = this.senderOf('audio');
    if (sender) await sender.replaceTrack(track || null);
  }

  // ---------- connection state & recovery ----------

  setConnection(connection) {
    if (this.connection === connection) return;
    this.connection = connection;
    log('connection', connection);
    this.onChange({ connection });
  }

  onIceState(forceFailed = false) {
    if (this.closed) return;
    const state = forceFailed ? 'failed' : this.pc.iceConnectionState;
    if (state === 'connected' || state === 'completed') {
      clearTimeout(this.timers.connect);
      clearTimeout(this.timers.restart);
      clearTimeout(this.timers.giveUp);
      this.lostSince = 0;
      this.restarts = 0;
      if (!this.everConnected) {
        this.everConnected = true;
        this.tuneSenders();
        this.timers.stats = setInterval(() => this.sampleStats(), STATS_EVERY_MS);
      }
      this.setConnection('connected');
      return;
    }
    if (!this.everConnected) {
      if (state === 'failed') this.setConnection('failed'); // UI offers Retry / audio only
      else if (this.connection !== 'failed') this.setConnection('connecting');
      return;
    }
    if (state === 'disconnected') {
      this.markLost();
      // Often recovers by itself within a few seconds; restart if it doesn't.
      clearTimeout(this.timers.restart);
      this.timers.restart = setTimeout(() => this.restartIce('disconnected'), this.polite ? 3500 : 2000);
    } else if (state === 'failed') {
      this.markLost();
      this.restartIce('failed');
    }
  }

  markLost() {
    this.setConnection('reconnecting');
    if (!this.lostSince) {
      this.lostSince = Date.now();
      clearTimeout(this.timers.giveUp);
      this.timers.giveUp = setTimeout(() => {
        if (!this.closed && this.connection !== 'connected') this.setConnection('lost');
      }, RECONNECT_GIVE_UP_MS);
    }
  }

  networkChanged(reason) {
    if (this.closed || !this.everConnected) return;
    clearTimeout(this.timers.net);
    // Wait a moment for the new network to settle, then refresh the path.
    this.timers.net = setTimeout(() => {
      const s = this.pc.iceConnectionState;
      if (s !== 'connected' && s !== 'completed') this.markLost();
      this.restartIce(reason);
    }, 800);
  }

  async restartIce(reason) {
    if (this.closed) return;
    if (this.restarts >= MAX_RESTARTS) return;
    const s = this.pc.iceConnectionState;
    if (reason === 'disconnected' && (s === 'connected' || s === 'completed')) return;
    this.restarts += 1;
    log('ice restart', reason, this.restarts);
    try {
      const iceServers = await this.refreshIce?.();
      if (iceServers?.length && !this.closed) this.pc.setConfiguration({ ...this.pc.getConfiguration(), iceServers });
    } catch {
      /* keep current servers */
    }
    if (this.closed) return;
    try {
      this.pc.restartIce(); // fires negotiationneeded -> new offer with fresh ICE credentials
    } catch {
      /* very old browser */
    }
  }

  // Manual retry from the "Could not connect" screen.
  retry() {
    if (this.closed) return;
    this.restarts = 0;
    this.setConnection('connecting');
    clearTimeout(this.timers.connect);
    this.timers.connect = setTimeout(() => {
      if (!this.everConnected && !this.closed) this.setConnection('failed');
    }, CONNECT_TIMEOUT_MS);
    this.restartIce('retry');
  }

  // ---------- quality monitor ----------

  async sampleStats() {
    if (this.closed) return;
    let report;
    try {
      report = await this.pc.getStats();
    } catch {
      return;
    }
    let pair;
    let inAudio;
    let inVideo;
    let remoteInVideo;
    let remoteInAudio;
    report.forEach((r) => {
      if (r.type === 'candidate-pair' && r.state === 'succeeded' && (r.nominated || r.selected)) {
        if (!pair || r.nominated) pair = r;
      } else if (r.type === 'inbound-rtp' && r.kind === 'audio') inAudio = r;
      else if (r.type === 'inbound-rtp' && r.kind === 'video') inVideo = r;
      else if (r.type === 'remote-inbound-rtp' && r.kind === 'video') remoteInVideo = r;
      else if (r.type === 'remote-inbound-rtp' && r.kind === 'audio') remoteInAudio = r;
    });

    const now = Date.now();
    const dt = this.prev.at ? (now - this.prev.at) / 1000 : 0;
    const rtt = pair?.currentRoundTripTime ?? remoteInAudio?.roundTripTime ?? 0;
    const jitter = inAudio?.jitter ?? 0;

    // Audio loss over the last interval (what we hear).
    let audioLoss = 0;
    if (inAudio && this.prev.audioRecv !== undefined) {
      const lost = Math.max(0, (inAudio.packetsLost || 0) - this.prev.audioLost);
      const recv = Math.max(0, (inAudio.packetsReceived || 0) - this.prev.audioRecv);
      audioLoss = lost + recv > 0 ? lost / (lost + recv) : 0;
    }
    const inBitrate = inVideo && dt && this.prev.videoBytes !== undefined ? ((inVideo.bytesReceived - this.prev.videoBytes) * 8) / dt : 0;
    this.prev = { at: now, audioLost: inAudio?.packetsLost || 0, audioRecv: inAudio?.packetsReceived || 0, videoBytes: inVideo?.bytesReceived };

    let quality = 'good';
    if (audioLoss > 0.1 || rtt > 0.8 || jitter > 0.1) quality = 'poor';
    else if (audioLoss > 0.03 || rtt > 0.4 || jitter > 0.05) quality = 'fair';

    // Adapt OUR outgoing video to what the network can carry.
    if (this.type === 'video' && this.senderOf('video')?.track) {
      const videoLoss = remoteInVideo?.fractionLost ?? 0;
      const available = pair?.availableOutgoingBitrate || 0;
      const level = VIDEO_LEVELS[this.videoLevel];
      const paused = !!level.paused;
      const bad = paused
        ? quality === 'poor'
        : videoLoss > 0.08 || rtt > 0.6 || audioLoss > 0.08 || (available && available < level.maxBitrate * 0.7);
      const nextUp = VIDEO_LEVELS[this.videoLevel - 1];
      const good = paused
        ? quality === 'good'
        : videoLoss < 0.02 && rtt < 0.35 && audioLoss < 0.02 && (!available || !nextUp || available > nextUp.maxBitrate * 1.2);

      if (bad) {
        this.badStreak += 1;
        this.goodStreak = 0;
      } else if (good) {
        this.goodStreak += 1;
        this.badStreak = 0;
      } else {
        this.badStreak = 0;
        this.goodStreak = 0;
      }

      if (this.badStreak >= 2 && this.videoLevel < VIDEO_LEVELS.length - 1) {
        this.videoLevel += 1;
        this.badStreak = 0;
        await this.applyVideoLevel();
        this.signalVideoLevel();
      } else if (this.videoLevel > 0 && this.goodStreak >= (paused ? 5 : 4)) {
        this.videoLevel -= 1;
        this.goodStreak = 0;
        await this.applyVideoLevel();
        this.signalVideoLevel();
      }
    }

    this.onChange({
      quality,
      stats: { rtt: Math.round(rtt * 1000), jitter: Math.round(jitter * 1000), audioLoss: Math.round(audioLoss * 1000) / 10, inKbps: Math.round(inBitrate / 1000), relay: await this.usingRelay(report, pair) },
      videoLevel: this.videoLevel,
      videoPausedForNetwork: !!VIDEO_LEVELS[this.videoLevel].paused,
    });
  }

  signalVideoLevel() {
    this.signal('call:media-state', { videoPaused: !!VIDEO_LEVELS[this.videoLevel].paused });
  }

  async usingRelay(report, pair) {
    if (!pair) return false;
    const local = report.get?.(pair.localCandidateId);
    return local?.candidateType === 'relay';
  }

  // ---------- teardown ----------

  close() {
    if (this.closed) return;
    this.closed = true;
    Object.values(this.timers).forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
    this.netInfo?.removeEventListener?.('change', this.onNetInfo);
    const pc = this.pc;
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.onnegotiationneeded = null;
    pc.oniceconnectionstatechange = null;
    pc.onconnectionstatechange = null;
    try {
      pc.getSenders().forEach((s) => s.track && s.track.stop());
    } catch {
      /* ignore */
    }
    try {
      pc.close();
    } catch {
      /* ignore */
    }
    this.remoteStream.getTracks().forEach((t) => t.stop());
  }
}
