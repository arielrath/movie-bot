const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const moviesFile = "./movies.json";

function getMovies() {
  if (!fs.existsSync(moviesFile)) return {};
  return JSON.parse(fs.readFileSync(moviesFile, "utf8"));
}

function saveMovies(movies) {
  fs.writeFileSync(moviesFile, JSON.stringify(movies, null, 2));
}

app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
  console.log("WEBHOOK RECEIVED!"); console.log(JSON.stringify(req.body, null, 2));
  const messages =
    req.body.entry?.[0]?.changes?.[0]?.value?.messages;

  if (messages?.length) {
    const message = messages[0];
    console.log("Incoming message:", message);
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Movie Bot is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));

