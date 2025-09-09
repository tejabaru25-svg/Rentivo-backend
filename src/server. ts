import dotenv from "dotenv";
dotenv.config();
import express from "express";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => res.json({ ok: true, version: "1.0" }));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Rentivo backend listening on ${port}`);
});
