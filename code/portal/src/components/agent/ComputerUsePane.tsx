import { useState } from "react";
import { motion } from "motion/react";

import { ChatPanel } from "./ChatPanel";
import { fadeRise } from "@/lib/motion";

interface Props {
  baseUrl: string;
  prompts: string[];
  dashboardUrl: string;
  onTurn?: (m: any) => void;
  onActive?: (a: boolean) => void;
}

/**
 * Split view: chat on the left, live iframe of the mock merchant
 * dashboard on the right. The agent drives the dashboard in its own
 * Chromium window (headful), but we also embed the static view here so
 * the operator can see the same state.
 */
export function ComputerUsePane({ baseUrl, prompts, dashboardUrl, onTurn, onActive }: Props) {
  const [tab, setTab] = useState<"chat" | "canvas">("chat");

  return (
    <div className="grid h-full" style={{ gridTemplateColumns: "minmax(320px, 420px) 1fr" }}>
      <div className="border-r border-[var(--border)] flex flex-col min-h-0">
        <ChatPanel baseUrl={baseUrl} prompts={prompts} onTurn={onTurn} onActive={onActive} />
      </div>
      <div className="flex flex-col min-h-0">
        <div className="h-10 flex items-center gap-1 px-3 border-b border-[var(--border)] text-[11px] tracking-[0.18em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
          <button
            onClick={() => setTab("canvas")}
            className="px-2 py-1 rounded-md hover:bg-[var(--elev-1)]"
            style={{ color: tab === "canvas" ? "var(--text)" : undefined }}
          >
            merchant console
          </button>
          <button
            onClick={() => setTab("chat")}
            className="px-2 py-1 rounded-md hover:bg-[var(--elev-1)]"
            style={{ color: tab === "chat" ? "var(--text)" : undefined }}
          >
            what the agent sees
          </button>
          <div className="ml-auto">
            <span className="text-[var(--text-faint)]">{dashboardUrl}</span>
          </div>
        </div>
        {tab === "canvas" ? (
          <iframe
            title="merchant console"
            src={dashboardUrl}
            className="flex-1 w-full bg-[var(--surface)] border-0"
          />
        ) : (
          <motion.div
            variants={fadeRise}
            initial="initial"
            animate="animate"
            className="flex-1 flex items-center justify-center p-12 text-center"
          >
            <p className="font-[var(--font-serif)] italic text-[var(--text-subtle)] text-[18px] max-w-[420px]">
              Screenshots from the agent's browser appear inline in the chat
              as the computer-use toolset returns them. Watch the left pane
              after the first tool call.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
