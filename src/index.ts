//import express
import express from "express";
import router from "./routers";
import bodyParser from "body-parser";
import cors from "cors";
import * as fs from "fs";
import { whatsappSocket } from "./services/whatsapp";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import e from "express";
const qrcode = require("qrcode");

dotenv.config();
const socketIO = require("socket.io");

// // init express
const app = express();

let server;
if (process.env.APP_PROTOCOL === "https") {
  // Certificate
  const credentials = {
    key: fs.readFileSync(
      "/etc/letsencrypt/live/wabot.galkasoft.id/privkey.pem",
      "utf8"
    ),
    cert: fs.readFileSync(
      "/etc/letsencrypt/live/wabot.galkasoft.id/cert.pem",
      "utf8"
    ),
    ca: fs.readFileSync(
      "/etc/letsencrypt/live/wabot.galkasoft.id/chain.pem",
      "utf8"
    ),
  };
  let http = require("https");

  server = http.createServer(credentials, app);
} else {
  let http = require("http");
  server = http.createServer(app);
}

app.use(
  cors({
    credentials: true,
    origin: [
      "http://localhost",
      "http://127.0.0.1",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
  }),
  bodyParser.urlencoded({
    extended: true,
  }),
  bodyParser.json()
);
app.use(router);

// listen on port
const io = socketIO(server, {
  cors: {
    origin: "*",
  },
});
server.listen(process.env.APP_PORT, () =>
  console.log("Server Running at http://localhost:" + process.env.APP_PORT)
);

io.on("connection", function (socket: any) {
  socket.on("initial", async () => {
    const user = await (await whatsappSocket).user;
    io.emit("user", user);
    io.emit("message", "Anda Telah Login");
  });
  socket.on("check", async (arg: any) => {
    const user = await (await whatsappSocket).user;
    console.log("\x1b[33m%s\x1b[0m", "Check Status User");

    io.emit("user", user);
    console.log("\x1b[33m%s\x1b[0m", user);
  });

  socket.on("qrcode", async (arg: any) => {
    console.log("\x1b[33m%s\x1b[0m", "Request QRCODE CLIENT SIDE");
    const user = await (await whatsappSocket).user;
    if (user) {
      io.emit("user", user);
      console.log("\x1b[33m%s\x1b[0m", user);
    }
  });

  socket.on("logout", async (arg: any) => {
    console.log("\x1b[33m%s\x1b[0m", "=== socket logout ===");
    if (fs.existsSync("./keystore")) {
      fs.rmSync("./keystore", {
        recursive: true,
        force: true,
      });
      socket.emit(
        "message",
        "Logout Berhasil, Silahakan Refresh dan tunggu 15-30 detik untuk dapat melakukan broadcast"
      );
    } else {
      socket.emit(
        "message",
        'class="text-center text-danger mt-4">Kamu belum melakukan scan, Scan terlebih dahulu!!'
      );
    }
  });
});

export { io };
