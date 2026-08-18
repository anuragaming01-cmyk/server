const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json());

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    server: "running"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
