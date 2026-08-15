import express from "express";

const app = express();

app.use(express.json());

app.get("/", function (req, res) {
  return res.json({ message: "Hello world" });
});

export { app };
