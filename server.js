// See the Good — sticker server, now with an in-Slack shortcut + modal,
// alongside the original standalone /send-sticker route (used by the
// picker webpage, if you still want that too).
//
// Setup:
//   1. npm install
//   2. .env needs:
//        SLACK_BOT_TOKEN=xoxb-...
//        SLACK_SIGNING_SECRET=...   (from Slack app's Basic Information page)
//   3. In your Slack app config:
//        - Turn ON "Interactivity & Shortcuts"
//        - Request URL: https://your-server.onrender.com/slack/events
//        - Add a Message Shortcut: name "Give a Strength Sticker",
//          callback_id "give_sticker"
//        - Bot Token Scopes needed: chat:write
//   4. node server.js  (or deploy to Render as before)

import express from "express";
import cors from "cors";
import "dotenv/config";
import pkg from "@slack/bolt";
const { App, ExpressReceiver } = pkg;

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

// --- shared send logic, used by both the shortcut flow and /send-sticker ---
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

  return client.chat.postMessage({
    channel,
    thread_ts,
    blocks,
    text: `${mention}was seen for ${strength}`,
  });
}

// --- Bolt app (handles the Slack shortcut + modal) --------------------
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: "/slack/events",
});

const boltApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

const strengthOptions = Object.keys(STICKER_IMAGES).map((name) => ({
  text: { type: "plain_text", text: name },
  value: name,
}));

// Message shortcut: right-click a message -> "Give a Strength Sticker"
boltApp.shortcut("give_sticker", async ({ shortcut, ack, client }) => {
  await ack();

  await client.views.open({
    trigger_id: shortcut.trigger_id,
    view: {
      type: "modal",
      callback_id: "give_sticker_submit",
      private_metadata: JSON.stringify({
        channel: shortcut.channel.id,
        thread_ts: shortcut.message.ts,
        recipient: shortcut.message.user, // author of the original message
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
          element: {
            type: "plain_text_input",
            action_id: "note_input",
            multiline: true,
          },
        },
      ],
    },
  });
});

// Modal submit handler
boltApp.view("give_sticker_submit", async ({ ack, view, client }) => {
  await ack();

  const { channel, thread_ts, recipient } = JSON.parse(view.private_metadata);
  const strength = view.state.values.strength_block.strength_select.selected_option.value;
  const note = view.state.values.note_block.note_input.value || "";

  await postSticker(client, { channel, thread_ts, strength, note, mentionUserId: recipient });
});

// --- plain express routes, mounted on the same app as Bolt's receiver --
const app = receiver.app;
app.use(cors());
app.use(express.json());

// Kept from the standalone-picker version, for the webpage flow if you
// still want that alongside the in-Slack shortcut.
app.post("/send-sticker", async (req, res) => {
  try {
    const { strength, recipient, note } = req.body;
    if (!strength || !recipient) {
      return res.status(400).json({ error: "strength and recipient are required" });
    }
    const result = await postSticker(boltApp.client, {
      channel: recipient, // expects a resolved Slack channel/user ID here
      strength,
      note,
    });
    res.json({ ok: true, ts: result.ts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sticker server running on :${PORT}`));
