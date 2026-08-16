// See the Good — sticker send backend
//
// The frontend (StickerPicker.jsx) can't call Slack directly:
//   1. Slack blocks browser-origin requests (CORS).
//   2. Your bot token must never be shipped to a browser.
// This tiny server sits in between: frontend -> this server -> Slack.
//
// Setup:
//   1. npm init -y && npm install express node-fetch cors dotenv
//   2. Create a Slack app at https://api.slack.com/apps
//      - Add bot token scope: chat:write
//      - Install to workspace, copy the Bot User OAuth Token (xoxb-...)
//   3. Create a .env file:  SLACK_BOT_TOKEN=xoxb-...
//   4. node server.js
//   5. Deploy anywhere (Render, Railway, Fly.io, a small VPS) and put
//      the public URL + "/send-sticker" into the artifact's
//      "Backend settings" field.

import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// Map strength name -> hosted image URL for the sticker art.
// Replace these with real hosted URLs (S3/Cloudinary/GitHub raw) once
// you've cropped each circle out of the sticker sheet.
const STICKER_IMAGES = {
  Kindness: "https://example.com/stickers/kindness.png",
  Curiosity: "https://example.com/stickers/curiosity.png",
  // ...add the remaining 32 strengths here
};

// recipient can be a Slack user ID (U...), a channel ID (C...), or an
// @handle/#channel-name that you resolve to an ID first (see resolveTarget).
async function resolveTarget(recipient) {
  if (/^[UC][A-Z0-9]{6,}$/.test(recipient)) return recipient;

  const handle = recipient.replace(/^[@#]/, "");
  const isChannel = recipient.startsWith("#");

  const url = isChannel
    ? "https://slack.com/api/conversations.list?limit=1000"
    : "https://slack.com/api/users.list?limit=1000";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack lookup failed: ${data.error}`);

  if (isChannel) {
    const ch = data.channels.find((c) => c.name === handle);
    if (!ch) throw new Error(`Channel #${handle} not found`);
    return ch.id;
  } else {
    const user = data.members.find(
      (m) => m.name === handle || m.profile?.display_name === handle
    );
    if (!user) throw new Error(`User @${handle} not found`);
    return user.id;
  }
}

app.post("/send-sticker", async (req, res) => {
  try {
    const { strength, recipient, note } = req.body;
    if (!strength || !recipient) {
      return res.status(400).json({ error: "strength and recipient are required" });
    }

    const target = await resolveTarget(recipient);
    const imageUrl = STICKER_IMAGES[strength];

    const blocks = [];
    if (imageUrl) {
      blocks.push({ type: "image", image_url: imageUrl, alt_text: strength });
    }
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*You were seen for: ${strength}*${note ? `\n${note}` : ""}`,
      },
    });

    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: target, blocks, text: `You were seen for: ${strength}` }),
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) throw new Error(`Slack error: ${slackData.error}`);

    res.json({ ok: true, ts: slackData.ts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sticker server running on :${PORT}`));
