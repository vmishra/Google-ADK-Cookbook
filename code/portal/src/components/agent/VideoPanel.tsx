import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Video, VideoOff, Wrench, Send } from "lucide-react";

import { Chip } from "@/components/primitives/Chip";
import { chipEnter, fadeRise, spring } from "@/lib/motion";

interface Props {
  baseUrl: string;
  onActive?: (active: boolean) => void;
  onTurn?: (metrics: any) => void;
}

interface TranscriptLine {
  role: "user" | "model";
  text: string;
}

interface ToolEvent {
  name: string;
  args: any;
  result?: any;
  id: string;
}

const FRAME_INTERVAL_MS = 1000;
const FRAME_JPEG_QUALITY = 0.6;
const FRAME_MAX_WIDTH = 960;

export function VideoPanel({ baseUrl, onActive, onTurn }: Props) {
  const [connected, setConnected] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [tools, setTools] = useState<ToolEvent[]>([]);
  const [typed, setTyped] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<number | null>(null);
  const captionScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => stopEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    captionScrollRef.current?.scrollTo({
      top: captionScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript]);

  const connect = async () => {
    if (wsRef.current) return;
    setError(null);
    try {
      const h = await fetch(`${baseUrl}/health`);
      if (!h.ok) throw new Error("health check failed");
    } catch {
      setError(`Agent is not reachable at ${baseUrl}. Start the video server first.`);
      return;
    }
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };
    ws.onerror = () => setError("WebSocket error. See the browser console.");

    ws.onmessage = (evt) => {
      let msg: any;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }
      if (msg.kind === "transcript") {
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
      } else if (msg.kind === "tool_result") {
        setTools((arr) => {
          const copy = [...arr];
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i]!.name === msg.name && copy[i]!.result === undefined) {
              copy[i] = { ...copy[i]!, result: msg.data };
              break;
            }
          }
          return copy;
        });
      } else if (msg.kind === "metrics_tick" || msg.kind === "turn_complete") {
        if (msg.metrics) onTurn?.(msg.metrics);
        if (msg.kind === "turn_complete") onActive?.(false);
      } else if (msg.kind === "error") {
        setError(msg.data);
      }
    };
  };

  const startCamera = async () => {
    if (!wsRef.current) await connect();
    if (!wsRef.current) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      camStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamOn(true);
      onActive?.(true);
      startFrameLoop();
    } catch (e: any) {
      setError(`Camera unavailable — ${e.message || e}`);
    }
  };

  const stopCamera = () => {
    if (captureTimerRef.current != null) {
      window.clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
    onActive?.(false);
  };

  const startFrameLoop = () => {
    if (captureTimerRef.current != null) return;
    captureTimerRef.current = window.setInterval(() => {
      captureAndSendFrame();
    }, FRAME_INTERVAL_MS);
  };

  const captureAndSendFrame = () => {
    const v = videoRef.current;
    const ws = wsRef.current;
    if (!v || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (v.videoWidth === 0 || v.videoHeight === 0) return;
    const scale = Math.min(1, FRAME_MAX_WIDTH / v.videoWidth);
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", FRAME_JPEG_QUALITY);
    const base64 = dataUrl.split(",")[1];
    if (!base64) return;
    ws.send(JSON.stringify({ kind: "video", data: base64 }));
  };

  const sendText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ kind: "text", data: trimmed }));
    setTranscript((arr) => [...arr, { role: "user", text: trimmed }]);
    setTyped("");
  };

  const stopEverything = () => {
    stopCamera();
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ kind: "end" }));
      } catch {
        /* no-op */
      }
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface)]">
      <div className="flex-1 min-h-0 flex">
        {/* Camera preview */}
        <div className="flex-1 min-w-0 flex items-center justify-center bg-[oklch(12%_0_0)] relative">
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-w-full max-h-full object-contain"
            style={{ display: camOn ? "block" : "none" }}
          />
          {!camOn && (
            <div className="text-center px-6">
              <motion.p
                variants={fadeRise}
                initial="initial"
                animate="animate"
                className="font-[var(--font-serif)] italic text-[var(--text-muted)] text-[24px] leading-[1.35] max-w-[420px]"
              >
                Point the camera at whatever the agent should look at. One
                frame per second is captured and captioned below.
              </motion.p>
              {error && (
                <div
                  className="mt-4 inline-block px-4 py-2 rounded-[var(--radius-md)] border text-[13px]"
                  style={{
                    background: "color-mix(in oklab, var(--danger) 10%, transparent)",
                    borderColor: "color-mix(in oklab, var(--danger) 45%, transparent)",
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          )}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span
              className="h-[8px] w-[8px] rounded-full"
              style={{
                background: connected ? "var(--accent)" : "var(--text-subtle)",
                boxShadow: connected
                  ? "0 0 0 3px color-mix(in oklab, var(--accent) 30%, transparent)"
                  : undefined,
              }}
            />
            <span className="text-[10.5px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-white/80">
              {connected ? "live" : "offline"}
            </span>
          </div>
        </div>

        {/* Captions + tool rail */}
        <aside className="w-[360px] shrink-0 border-l border-[var(--border)] flex flex-col min-h-0">
          <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-raised)]">
            <div className="kicker">captions</div>
          </div>
          <div
            ref={captionScrollRef}
            className="flex-1 overflow-auto px-5 py-4 space-y-3"
          >
            <AnimatePresence initial={false}>
              {transcript.map((line, i) => (
                <motion.div
                  key={i}
                  variants={fadeRise}
                  initial="initial"
                  animate="animate"
                >
                  <div className="kicker mb-1">
                    {line.role === "user" ? "you" : "agent"}
                  </div>
                  <motion.div
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: 1, transition: spring }}
                    className="text-[13.5px] leading-[1.55] text-[var(--text)] whitespace-pre-wrap"
                  >
                    {line.text}
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
            {transcript.length === 0 && (
              <div className="text-[13px] text-[var(--text-subtle)] italic">
                Captions appear here as the agent narrates each frame.
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 pt-2">
              <AnimatePresence>
                {tools.map((t) => (
                  <motion.div
                    key={t.id}
                    variants={chipEnter}
                    initial="initial"
                    animate="animate"
                  >
                    <Chip tone="accent">
                      <Wrench size={11} strokeWidth={1.8} />
                      <span className="font-[var(--font-mono)]">{t.name}</span>
                    </Chip>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </div>

      {/* Controls */}
      <div className="shrink-0 px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-raised)] flex items-center gap-3">
        <button
          type="button"
          onClick={camOn ? stopCamera : startCamera}
          className="flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[var(--radius-md)] border transition-colors"
          style={{
            background: camOn
              ? "color-mix(in oklab, var(--danger) 12%, transparent)"
              : "color-mix(in oklab, var(--accent) 14%, transparent)",
            borderColor: camOn
              ? "color-mix(in oklab, var(--danger) 45%, transparent)"
              : "color-mix(in oklab, var(--accent) 45%, transparent)",
            color: "var(--text)",
          }}
        >
          {camOn ? (
            <>
              <VideoOff size={14} strokeWidth={2} /> stop camera
            </>
          ) : (
            <>
              <Video size={14} strokeWidth={2} /> start camera
            </>
          )}
        </button>
        <form
          className="flex-1 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendText(typed);
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type a question (combines with the live frame)"
            className="flex-1 bg-[var(--elev-1)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 text-[13.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={!typed.trim() || !connected}
            aria-label="Send"
            className="h-9 w-9 rounded-full bg-[var(--accent)] text-[oklch(16%_0_0)] flex items-center justify-center disabled:opacity-30"
          >
            <Send size={14} strokeWidth={1.9} />
          </button>
        </form>
      </div>
    </div>
  );
}
