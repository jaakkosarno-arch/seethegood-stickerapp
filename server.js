// See the Good — sticker server, Socket Mode version.
//
// With Socket Mode, Slack connects OUT to this server over a WebSocket —
// you don't need a public Request URL for shortcuts/events. You still
// need a normal HTTP route for /send-sticker (used by the standalone
// picker webpage) and Render needs *something* listening on $PORT for
// its health check, so we run a small Express server alongside Bolt.
//
// Setup:
//   1. npm install
//   2. .env / Render environment variables need:
//        SLACK_BOT_TOKEN=xoxb-...
//        SLACK_APP_TOKEN=xapp-...   (Basic Information -> App-Level Tokens
//                                    -> generate one with scope connections:write)
//   3. In Slack app config:
//        - Socket Mode -> On (this generates/uses the App-Level Token)
//        - Interactivity & Shortcuts -> On (no Request URL needed in Socket Mode)
//        - Message Shortcut: name "Give a Strength Sticker", callback_id "give_sticker"
//        - Event Subscriptions -> On, subscribe to bot event "app_home_opened"
//        - App Home -> Home Tab enabled
//        - Bot Token Scopes: chat:write
//   4. node server.js

import express from "express";
import cors from "cors";
import "dotenv/config";
import pkg from "@slack/bolt";
const { App } = pkg;

const BASE = "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main";

const STICKER_IMAGES = {
  "Strength Spotter": `${BASE}/strength-spotter.png`,
  "Love of Learning": `${BASE}/love-of-learning.png`,
  "Gratitude": `${BASE}/gratitude.png`,
  "Modesty": `${BASE}/modesty.png`,
  "Humour": `${BASE}/humour.png`,
  "Creativity": `${BASE}/creativity.png`,
  "Hope": `${BASE}/hope.png`,
  "Kindness": `${BASE}/kindness.png`,
  "Compassion": `${BASE}/compassion.png`,
  "Love of Beauty": `${BASE}/love-of-beauty.png`,
  "Enthusiasm": `${BASE}/enthusiasm.png`,
  "Love": `${BASE}/love.png`,
  "Self-regulation": `${BASE}/self-regulation.png`,
  "Honesty": `${BASE}/honesty.png`,
  "Leadership": `${BASE}/leadership.png`,
  "Grit": `${BASE}/grit.png`,
  "Carefulness": `${BASE}/carefulness.png`,
  "Forgiveness": `${BASE}/forgiveness.png`,
  "Perspective": `${BASE}/perspective.png`,
  "Fairness": `${BASE}/fairness.png`,
  "Curiosity": `${BASE}/curiosity.png`,
  "Spirituality": `${BASE}/spirituality.png`,
  "Courage": `${BASE}/courage.png`,
  "Judgement": `${BASE}/judgement.png`,
  "Social Intelligence": `${BASE}/social-intelligence.png`,
  "Perseverance": `${BASE}/perseverance.png`,
  "Teamwork": `${BASE}/teamwork.png`,
};

// --- in-memory store (see earlier note: resets on restart/redeploy;
// swap for a real DB when ready to keep permanent history) -------------
const store = new Map();

function recordSticker(userId, strength) {
  if (!userId) return;
  if (!store.has(userId)) store.set(userId, new Map());
  const counts = store.get(userId);
  counts.set(strength, (counts.get(strength) || 0) + 1);
}

function getCollection(userId) {
  const counts = store.get(userId);
  if (!counts) return [];
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// --- shared send logic ---------------------------------------------------
async function postSticker(client, { channel, thread_ts, strength, note, mentionUserId }) {
  const imageUrl = STICKER_IMAGES[strength];
  const blocks = [];
  if (imageUrl) {
    blocks.push({ type: "image", image_url: imageUrl, alt_text: strength });
  }
  const mention = mentionUserId ? `<@${mentionUserId}> ` : "";
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `${mention}was seen for *${strength}*${note ? `\n${note}` : ""}`,
    },
  });

  const result = await client.chat.postMessage({
    channel,
    thread_ts,
    blocks,
    text: `${mention}was seen for ${strength}`,
  });

  if (mentionUserId) recordSticker(mentionUserId, strength);
  return result;
}

// --- Home tab --------------------------------------------------------------
async function publishHome(client, userId) {
  const collection = getCollection(userId);
  const total = collection.reduce((sum, [, count]) => sum + count, 0);

  let blocks;
  if (collection.length === 0) {
    blocks = [
      { type: "header", text: { type: "plain_text", text: "Your Strength Collection" } },
      {
        type: "section",
        text: { type: "mrkdwn", text: "No stickers yet — once a colleague sees the good in you, it'll show up here." },
      },
    ];
  } else {
    blocks = [
      { type: "header", text: { type: "plain_text", text: "Your Strength Collection" } },
      { type: "context", elements: [{ type: "mrkdwn", text: `*${total}* stickers collected` }] },
      { type: "divider" },
      ...collection.flatMap(([strength, count]) => {
        const imageUrl = STICKER_IMAGES[strength];
        const elements = [];
        if (imageUrl) elements.push({ type: "image", image_url: imageUrl, alt_text: strength });
        elements.push({ type: "mrkdwn", text: `*${strength}*  ×${count}` });
        return [{ type: "context", elements }];
      }),
    ];
  }

  await client.views.publish({ user_id: userId, view: { type: "home", blocks } });
}

// --- Bolt app, Socket Mode ---------------------------------------------
const boltApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

const strengthOptions = Object.keys(STICKER_IMAGES).map((name) => ({
  text: { type: "plain_text", text: name },
  value: name,
}));

boltApp.shortcut("give_sticker", async ({ shortcut, ack, client }) => {
  console.log("Shortcut triggered:", shortcut.callback_id);
  await ack();
  await client.views.open({
    trigger_id: shortcut.trigger_id,
    view: {
      type: "modal",
      callback_id: "give_sticker_submit",
      private_metadata: JSON.stringify({
        channel: shortcut.channel.id,
        thread_ts: shortcut.message.ts,
        recipient: shortcut.message.user,
      }),
      title: { type: "plain_text", text: "Give a sticker" },
      submit: { type: "plain_text", text: "Send" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "input",
          block_id: "strength_block",
          label: { type: "plain_text", text: "Strength" },
          element: {
            type: "static_select",
            action_id: "strength_select",
            options: strengthOptions,
            placeholder: { type: "plain_text", text: "Pick a strength" },
          },
        },
        {
          type: "input",
          block_id: "note_block",
          optional: true,
          label: { type: "plain_text", text: "Note (optional)" },
          element: { type: "plain_text_input", action_id: "note_input", multiline: true },
        },
      ],
    },
  });
});

boltApp.view("give_sticker_submit", async ({ ack, view, client }) => {
  console.log("Modal submitted");
  await ack();
  try {
    const { channel, thread_ts, recipient } = JSON.parse(view.private_metadata);
    const strength = view.state.values.strength_block.strength_select.selected_option.value;
    const note = view.state.values.note_block.note_input.value || "";
    console.log("Sending sticker:", { channel, thread_ts, recipient, strength });
    await postSticker(client, { channel, thread_ts, strength, note, mentionUserId: recipient });
    console.log("Sticker posted successfully");
    await publishHome(client, recipient);
  } catch (err) {
    console.error("Failed to post sticker:", err);
  }
});

boltApp.event("app_home_opened", async ({ event, client }) => {
  if (event.tab !== "home") return;
  await publishHome(client, event.user);
});

// --- separate plain Express server for /send-sticker + Render health check --
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("See the Good sticker server is running."));

app.post("/send-sticker", async (req, res) => {
  try {
    const { strength, recipient, note } = req.body;
    if (!strength || !recipient) {
      return res.status(400).json({ error: "strength and recipient are required" });
    }
    const result = await postSticker(boltApp.client, { channel: recipient, strength, note });
    res.json({ ok: true, ts: result.ts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

(async () => {
  await boltApp.start(); // opens the Socket Mode WebSocket connection
  console.log("⚡️ Slack Bolt app running in Socket Mode");
  app.listen(PORT, () => console.log(`HTTP server (for /send-sticker) running on :${PORT}`));
})();
