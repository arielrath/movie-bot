const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ADMIN_WA_ID = process.env.ADMIN_WA_ID;

const moviesFile = path.join(__dirname, "movies.json");

function getMovies() {
  if (!fs.existsSync(moviesFile)) return {};
  return JSON.parse(fs.readFileSync(moviesFile, "utf8"));
}

function saveMovies(movies) {
  fs.writeFileSync(
    moviesFile,
    JSON.stringify(movies, null, 2)
  );
}

async function sendMessage(to, message) {
  const response = await fetch(
    `https://graph.facebook.com/v27.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: message }
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.log("WhatsApp API error:", result);
  } else {
    console.log("Reply sent!");
  }
}

async function handleMessage(message) {
  const sender = message.from;
  const text = message.text?.body?.trim();

  if (!text || message.type !== "text") return;

  if (sender !== ADMIN_WA_ID) return;

  const lines = text.split("\n").map(x => x.trim()).filter(Boolean);
  const movies = getMovies();

  // שמירת סרט
  if (lines.length >= 2) {
    const title = lines[0];
    const link = lines[1];

    try {
      const url = new URL(link);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid URL");
      }

      movies[title.toLowerCase()] = {
        title,
        link
      };

      saveMovies(movies);

      await sendMessage(
        sender,
        `הסרט "${title}" נשמר בהצלחה!`
      );
    } catch {
      await sendMessage(
        sender,
        "הקישור לא תקין. שלח קישור שמתחיל ב-https://"
      );
    }

    return;
  }

  // חיפוש סרט
  const movie = movies[text.toLowerCase()];

  if (movie) {
    await sendMessage(
      sender,
      `${movie.title}\n${movie.link}`
    );
  } else {
    await sendMessage(
      sender,
      `הסרט "${text}" לא נמצא במאגר.`
    );
  }
}

// אימות Webhook
app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }

  res.sendStatus(403);
});

// קבלת הודעות
app.post("/webhook", (req, res) => {
  console.log("WEBHOOK RECEIVED!");

  res.sendStatus(200);

  for (const entry of req.body.entry || []) {
    for (const change of entry.changes || []) {
      const messages = change.value.messages || [];

      for (const message of messages) {
        console.log("Incoming message:", message);

        handleMessage(message).catch(error => {
          console.log("Message error:", error);
        });
      }
    }
  }
});

app.get("/", (req, res) => {
  res.send("Movie Bot is running!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});
