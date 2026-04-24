import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mic, MicOff, Wrench } from "lucide-react";

import { Chip } from "@/components/primitives/Chip";
import { chipEnter, fadeRise, spring } from "@/lib/motion";

interface Props {
  baseUrl: string;
  onTurn?: (metrics: any) => void;
  onActive?: (active: boolean) => void;
}

interface TranscriptLine {
  role: "user" | "model";
  text: string;
}

interface ToolEvent {
  name: string;
  args: any;
  id: string;
}

export function VoicePanel({ baseUrl, onTurn, onActive }: Props) {
  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [tools, setTools] = useState<ToolEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const playheadRef = useRef<number>(0);
  // Every scheduled PCM source lives here until it finishes playing,
  // so we can .stop() them all when the server signals interruption.
  const pendingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    return () => stopEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    if (wsRef.current) return;
    setError(null);
    try {
      // test HTTP first so we surface a useful error if offline.
      const h = await fetch(`${baseUrl}/health`);
      if (!h.ok) throw new Error("health check failed");
    } catch {
      setError(`Agent is not reachable at ${baseUrl}. Start the voice server first.`);
      return;
    }
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); wsRef.current = null; };
    ws.onerror = () => setError("WebSocket error. See the browser console.");

    ws.onmessage = (evt) => {
      let msg: any; try { msg = JSON.parse(evt.data); } catch { return; }
      if (msg.kind === "audio") playPcmChunk(msg.data);
      else if (msg.kind === "interrupted") drainPlayback();
      else if (msg.kind === "transcript") {
        setTranscript((arr) => {
          const copy = [...arr];
          const last = copy[copy.length - 1];
          if (last && last.role === msg.role) {
            copy[copy.length - 1] = { ...last, text: last.text + msg.data };
          } else {
            copy.push({ role: msg.role, text: msg.data });
          }
          return copy;
        });
      } else if (msg.kind === "tool_call") {
        setTools((arr) => [
          ...arr,
          { name: msg.name, args: msg.args, id: crypto.randomUUID() },
        ]);
      } else if (msg.kind === "metrics_tick") {
        if (msg.metrics) onTurn?.(msg.metrics);
      } else if (msg.kind === "turn_complete") {
        onActive?.(false);
        if (msg.metrics) onTurn?.(msg.metrics);
      }
    };

    // audio setup — a fresh AudioContext for every session, so the
    // playhead must be reset too. Otherwise its old value (from the
    // previous ctx's timebase) schedules the first chunk in the far
    // future and the user hears nothing for seconds on reconnect.
    const ctx = new AudioContext({ sampleRate: 24000 });
    await ctx.audioWorklet.addModule(workletURL);
    audioCtxRef.current = ctx;
    playheadRef.current = 0;
  };

  const startMic = async () => {
    if (!wsRef.current) await connect();
    if (!wsRef.current || !audioCtxRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      micStreamRef.current = stream;
      const src = audioCtxRef.current.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(audioCtxRef.current, "pcm-sender", {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
      });
      worklet.port.onmessage = (e) => {
        const buf: ArrayBuffer = e.data;
        if (!wsRef.current || wsRef.current.readyState !== 1) return;
        const b64 = arrayBufferToBase64(buf);
        wsRef.current.send(JSON.stringify({ kind: "audio", data: b64 }));
      };
      src.connect(worklet);
      workletRef.current = worklet;
      setMicOn(true);
      onActive?.(true);
    } catch (e: any) {
      setError(`Microphone: ${e.message || e}`);
    }
  };

  const stopMic = () => {
    workletRef.current?.disconnect();
    workletRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setMicOn(false);
    onActive?.(false);
  };

  const stopEverything = () => {
    stopMic();
    drainPlayback();
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ kind: "end" }));
      } catch {
        /* socket already closed */
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    playheadRef.current = 0;
    setConnected(false);
    onActive?.(false);
  };

  const playPcmChunk = (b64: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const pcm = base64ToInt16(b64);
    const buf = ctx.createBuffer(1, pcm.length, 24000);
    const data = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) data[i] = pcm[i]! / 32768;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    const start = Math.max(now, playheadRef.current);
    // Track the source so drainPlayback() can stop it on interruption.
    // Self-unregister when it finishes naturally so the set doesn't grow.
    pendingSourcesRef.current.add(src);
    src.onended = () => pendingSourcesRef.current.delete(src);
    src.start(start);
    playheadRef.current = start + buf.duration;
  };

  /** Stop every scheduled PCM source and reset the playhead. Called
      when Gemini reports interruption (user barged in) so the old
      response doesn't bleed over the new one. */
  const drainPlayback = () => {
    for (const src of pendingSourcesRef.current) {
      try { src.stop(); } catch { /* already ended */ }
    }
    pendingSourcesRef.current.clear();
    playheadRef.current = audioCtxRef.current?.currentTime ?? 0;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--elev-1)]">
      <div className="flex-1 overflow-auto px-6 py-6 space-y-4" aria-live="polite">
        {transcript.length === 0 && tools.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <motion.p
              variants={fadeRise}
              initial="initial"
              animate="animate"
              className="font-[var(--font-serif)] italic text-[var(--text-muted)] text-[22px] text-center max-w-[380px]"
            >
              Connect, then press and hold to speak — or just start talking.
            </motion.p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {tools.map((t) => (
            <motion.div key={t.id} variants={chipEnter} initial="initial" animate="animate">
              <Chip tone="accent">
                <Wrench size={11} strokeWidth={1.8} />
                <span className="font-[var(--font-mono)]">{t.name}</span>
              </Chip>
            </motion.div>
          ))}
        </AnimatePresence>
        {transcript.map((line, i) => (
          <motion.div
            key={i}
            variants={fadeRise}
            initial="initial"
            animate="animate"
            className={line.role === "user" ? "flex justify-end" : ""}
          >
            <div
              className={
                line.role === "user"
                  ? "max-w-[78%] rounded-[var(--radius-lg)] bg-[var(--elev-2)] border border-[var(--border)] px-4 py-2.5"
                  : "max-w-[78%] flex flex-col gap-1"
              }
            >
              {line.role === "model" && <span className="kicker">agent</span>}
              <p className="text-[14px] leading-[1.55] whitespace-pre-wrap">{line.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
      {error && (
        <div className="px-5 py-3 text-[13px] text-[var(--danger)] border-t border-[var(--border)]">
          {error}
        </div>
      )}
      <div className="border-t border-[var(--border)] px-5 py-4 flex items-center gap-3 bg-[var(--elev-2)]">
        <button
          type="button"
          onClick={connected ? stopEverything : connect}
          className="h-9 px-3.5 rounded-full border border-[var(--border)] text-[13px] font-medium hover:bg-[var(--elev-2)] transition-colors"
        >
          {connected ? "End call" : "Connect"}
        </button>
        <motion.button
          type="button"
          onClick={micOn ? stopMic : startMic}
          disabled={!connected && !micOn}
          whileHover={{ scale: 1.02, transition: spring }}
          whileTap={{ scale: 0.98 }}
          className="h-11 px-5 rounded-full flex items-center gap-2 font-medium text-[13px]"
          style={{
            background: micOn ? "var(--accent)" : "var(--elev-1)",
            color: micOn ? "oklch(16% 0 0)" : "var(--text)",
            border: `1px solid ${micOn ? "var(--accent)" : "var(--border)"}`,
          }}
        >
          {micOn ? <Mic size={15} strokeWidth={1.8} /> : <MicOff size={15} strokeWidth={1.8} />}
          {micOn ? "Listening" : "Start microphone"}
        </motion.button>
      </div>
    </div>
  );
}

/* ---------- audio helpers ---------- */

function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer, bytes.byteOffset, len / 2);
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Inline AudioWorklet: downsamples mic (usually 48k) to 16k PCM16 and
 * posts ~20 ms chunks back to the main thread.
 *
 * The worklet runs every 128-sample render quantum (~2.67 ms at
 * 48 kHz). Emitting a WebSocket message per tick floods the socket
 * with ~375 tiny frames per second and can stutter under backpressure
 * — so we accumulate to CHUNK_SAMPLES_16K (320 ≈ 20 ms @ 16 kHz)
 * before posting, matching Gemini Live's recommended chunk size.
 */
const workletSource = `
const CHUNK_SAMPLES_16K = 320;
class PcmSender extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(0);
    this._out = new Int16Array(0);
    this._ratio = sampleRate / 16000;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    const merged = new Float32Array(this._buffer.length + input.length);
    merged.set(this._buffer, 0);
    merged.set(input, this._buffer.length);
    const targetLen = Math.floor(merged.length / this._ratio);
    if (targetLen === 0) {
      this._buffer = merged;
      return true;
    }
    const downsampled = new Int16Array(targetLen);
    let lastSrcIdx = 0;
    for (let i = 0; i < targetLen; i++) {
      const srcIdx = Math.floor(i * this._ratio);
      const s = Math.max(-1, Math.min(1, merged[srcIdx]));
      downsampled[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      lastSrcIdx = srcIdx;
    }
    this._buffer = merged.slice(lastSrcIdx + 1);

    // Accumulate until we have at least one 20 ms chunk, then emit in
    // whole-chunk multiples. Any remainder stays queued for next tick.
    const combined = new Int16Array(this._out.length + downsampled.length);
    combined.set(this._out, 0);
    combined.set(downsampled, this._out.length);
    const whole = Math.floor(combined.length / CHUNK_SAMPLES_16K) * CHUNK_SAMPLES_16K;
    if (whole > 0) {
      const emit = combined.slice(0, whole);
      this._out = combined.slice(whole);
      this.port.postMessage(emit.buffer, [emit.buffer]);
    } else {
      this._out = combined;
    }
    return true;
  }
}
registerProcessor("pcm-sender", PcmSender);
`;
const workletURL = URL.createObjectURL(
  new Blob([workletSource], { type: "application/javascript" }),
);
