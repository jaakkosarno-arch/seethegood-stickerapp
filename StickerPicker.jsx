import React, { useState, useMemo, useRef } from "react";
import {
  Lightbulb, Heart, Sparkles, Smile, Star, Shield, Compass, Feather,
  Sun, Users, Eye, Scale, Puzzle, Anchor, Flame, Mountain, Gift,
  BookOpen, Wand2, HandHeart, MessageCircle, Wrench, Telescope,
  Backpack, Music, Handshake, RefreshCw, Moon, Trophy, Gem,
  ShieldCheck, Speaker, ScrollText, Milestone, Search
} from "lucide-react";

// ---- Token system -----------------------------------------------------
// Palette pulled directly from the physical sticker sheet, named.
const PALETTE = {
  cream: "#FBF7EE",
  ink: "#2B2622",
  coral: "#E76F51",
  teal: "#4A9B8E",
  mustard: "#E9B44C",
  plum: "#7B6591",
  sage: "#8FAE8B",
  slate: "#5C7A99",
  paper: "#FFFFFF",
};

const STRENGTHS = [
  { name: "Strength Spotter", color: PALETTE.ink, icon: Search },
  { name: "Love of Learning", color: PALETTE.slate, icon: Lightbulb },
  { name: "Gratitude", color: PALETTE.sage, icon: Heart },
  { name: "Modesty", color: PALETTE.mustard, icon: Feather },
  { name: "Humour", color: PALETTE.plum, icon: Smile },
  { name: "Creativity", color: PALETTE.slate, icon: Wand2 },
  { name: "Hope", color: PALETTE.teal, icon: Sun },
  { name: "Kindness", color: PALETTE.coral, icon: HandHeart },
  { name: "Compassion", color: PALETTE.plum, icon: HandHeart },
  { name: "Love of Beauty", color: "#E3B49A", icon: Sparkles },
  { name: "Enthusiasm", color: "#F2C9B0", icon: Flame },
  { name: "Love", color: PALETTE.coral, icon: Heart },
  { name: "Self-regulation", color: PALETTE.mustard, icon: Anchor },
  { name: "Honesty", color: "#7FB3A8", icon: ScrollText },
  { name: "Leadership", color: PALETTE.slate, icon: Compass },
  { name: "Grit", color: "#F0C9CE", icon: Mountain },
  { name: "Carefulness", color: "#9FC7A6", icon: Puzzle },
  { name: "Forgiveness", color: PALETTE.teal, icon: RefreshCw },
  { name: "Perspective", color: "#F3A9A0", icon: Eye },
  { name: "Fairness", color: "#B8D4C7", icon: Scale },
  { name: "Curiosity", color: "#E2A868", icon: Telescope },
  { name: "Spirituality", color: "#2E3F5C", icon: Moon },
  { name: "Courage", color: PALETTE.mustard, icon: ShieldCheck },
  { name: "Fairness ", color: "#F3E38C", icon: Backpack }, // Teamwork placeholder icon slot
  { name: "Judgement", color: "#C0432E", icon: Milestone },
  { name: "Social Intelligence", color: PALETTE.plum, icon: MessageCircle },
  { name: "Perseverance", color: "#5FA1A8", icon: Trophy },
  { name: "Teamwork", color: PALETTE.mustard, icon: Handshake },
];

// Backend endpoint that proxies to Slack's chat.postMessage (see server.js).
// Point this at your deployed backend once it exists.
const DEFAULT_ENDPOINT = "";

export default function StickerPicker() {
  const [selected, setSelected] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error | mock
  const [errorMsg, setErrorMsg] = useState("");
  const flightRef = useRef(null);

  const canSend = selected && recipient.trim().length > 0 && status !== "sending";

  const grouped = useMemo(() => STRENGTHS, []);

  async function handleSend() {
    if (!canSend) return;
    setStatus("sending");
    setErrorMsg("");

    if (!endpoint.trim()) {
      // No backend wired up yet — demonstrate the flow without a real send.
      setTimeout(() => {
        setStatus("mock");
      }, 900);
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strength: selected.name.trim(),
          recipient: recipient.trim(),
          note: note.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong sending the sticker.");
    }
  }

  function resetAfterSend() {
    setSelected(null);
    setRecipient("");
    setNote("");
    setStatus("idle");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PALETTE.cream,
        fontFamily:
          "'Nunito', ui-sans-serif, system-ui, -apple-system, sans-serif",
        color: PALETTE.ink,
        padding: "32px 20px 80px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Nunito:wght@400;600;700&display=swap');
        .display-font { font-family: 'Baloo 2', ui-rounded, sans-serif; }
        .sticker-btn {
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .sticker-btn:hover {
          transform: translateY(-4px) rotate(-2deg) scale(1.05);
          box-shadow: 0 10px 20px rgba(43,38,34,0.18);
        }
        .sticker-btn.selected {
          transform: translateY(-6px) scale(1.08);
          box-shadow: 0 14px 26px rgba(43,38,34,0.24);
        }
        @keyframes flyOff {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(0,-140px) scale(0.4); opacity: 0; }
        }
        .flying { animation: flyOff 0.7s ease-in forwards; }
        .focus-ring:focus-visible {
          outline: 3px solid ${PALETTE.slate};
          outline-offset: 2px;
        }
      `}</style>

      <header style={{ maxWidth: 980, margin: "0 auto 28px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h1 className="display-font" style={{ fontSize: 34, fontWeight: 800, margin: 0 }}>
            See the Good
          </h1>
          <span style={{ fontSize: 15, opacity: 0.65 }}>— give a strength sticker</span>
        </div>
        <p style={{ marginTop: 6, fontSize: 15, maxWidth: 560, lineHeight: 1.5, opacity: 0.8 }}>
          Peel a sticker off the sheet, say who earned it, and send it their way.
        </p>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr", gap: 28 }}>
        {/* Sticker sheet */}
        <section
          aria-label="Strength stickers"
          style={{
            background: PALETTE.paper,
            borderRadius: 20,
            padding: "22px 18px",
            boxShadow: "0 2px 10px rgba(43,38,34,0.08)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
              gap: 14,
            }}
          >
            {grouped.map((s, i) => {
              const Icon = s.icon;
              const isSelected = selected?.name === s.name && selected?.i === i;
              return (
                <button
                  key={s.name + i}
                  className={`sticker-btn focus-ring ${isSelected ? "selected" : ""} ${
                    status === "sending" && isSelected ? "flying" : ""
                  }`}
                  onClick={() => setSelected({ ...s, i })}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                  title={s.name}
                >
                  <span
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: "50%",
                      background: s.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: isSelected ? `3px solid ${PALETTE.ink}` : "3px solid transparent",
                    }}
                  >
                    <Icon size={28} color="#FFFFFF" strokeWidth={2.2} />
                  </span>
                  <span style={{ fontSize: 11.5, textAlign: "center", lineHeight: 1.2, fontWeight: 600 }}>
                    {s.name.trim()}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Compose panel */}
        <section
          aria-label="Send a sticker"
          style={{
            background: PALETTE.paper,
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 2px 10px rgba(43,38,34,0.08)",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 22,
            alignItems: "start",
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: selected ? selected.color : "#EDE7DA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {selected ? (
              <selected.icon size={42} color="#fff" strokeWidth={2} />
            ) : (
              <Gem size={30} color="#B7AE9C" />
            )}
          </div>

          <div>
            <p className="display-font" style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>
              {selected ? selected.name.trim() : "Pick a sticker above"}
            </p>

            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 4 }}>
              Who's it for?
            </label>
            <input
              className="focus-ring"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="@colleague or #channel"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1.5px solid #E3DCCB",
                fontSize: 14,
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />

            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 4 }}>
              Note (optional)
            </label>
            <textarea
              className="focus-ring"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you see?"
              rows={2}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1.5px solid #E3DCCB",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />

            <details style={{ marginTop: 14 }}>
              <summary style={{ fontSize: 12.5, cursor: "pointer", opacity: 0.7 }}>
                Backend settings
              </summary>
              <label style={{ display: "block", fontSize: 12.5, marginTop: 8, marginBottom: 4, opacity: 0.8 }}>
                Send endpoint (your deployed server.js URL)
              </label>
              <input
                className="focus-ring"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://your-server.example.com/send-sticker"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1.5px solid #E3DCCB",
                  fontSize: 12.5,
                  fontFamily: "monospace",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ fontSize: 11.5, opacity: 0.6, marginTop: 6, lineHeight: 1.4 }}>
                Left empty, Send just previews the flow. Fill this in once server.js is deployed to actually post to Slack.
              </p>
            </details>

            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className="focus-ring"
                disabled={!canSend}
                onClick={handleSend}
                style={{
                  background: canSend ? PALETTE.coral : "#E3DCCB",
                  color: "#fff",
                  border: "none",
                  padding: "11px 22px",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: canSend ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                {status === "sending" ? "Sending…" : "Send sticker"}
              </button>

              {status === "sent" && (
                <span style={{ color: PALETTE.sage, fontWeight: 700, fontSize: 13.5 }}>
                  Sent! <button onClick={resetAfterSend} style={{ marginLeft: 6, fontSize: 12, background: "none", border: "none", textDecoration: "underline", cursor: "pointer", color: PALETTE.ink }}>send another</button>
                </span>
              )}
              {status === "mock" && (
                <span style={{ color: PALETTE.slate, fontWeight: 600, fontSize: 13 }}>
                  Preview only — no endpoint set. <button onClick={resetAfterSend} style={{ marginLeft: 6, fontSize: 12, background: "none", border: "none", textDecoration: "underline", cursor: "pointer", color: PALETTE.ink }}>reset</button>
                </span>
              )}
              {status === "error" && (
                <span style={{ color: PALETTE.coral, fontWeight: 600, fontSize: 13 }}>
                  {errorMsg}
                </span>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
