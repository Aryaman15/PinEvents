import dotenv from "dotenv";

const result = dotenv.config();
console.log("DOTENV RESULT:", result);
import http from "http";
import mongoose from "mongoose";
import { createApp } from "./app";
import { configureSockets } from "./socket";

const { app, allowedOrigins } = createApp();
const port = Number(process.env.PORT ?? 4000);
const server = http.createServer(app);

configureSockets(server, allowedOrigins);

const startServer = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn("MONGO_URI is not set; skipping database connection.");
  } else {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`PinEvents API running on http://0.0.0.0:${port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
