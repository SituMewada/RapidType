import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
// import { disconnect } from "process";
import { fetchQuote, startCountdown } from "./helper.js";
const port = 5000;
const app = express();
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  })
);

app.get("/", (req, res) => {
  res.send("Hello World");
});

const clientRooms = {};
const roomState = {};

// const roomState = {
//   // players: {
//   //   playerone: {
//   //     id: null,
//   //     result: {},
//   //     playAgain: false,
//   //     disconnect: false,
//   //   },
//   //   playerTwo: {
//   //     id: null,
//   //     result: {},
//   //     playAgain: false,
//   //     disconnect: false,
//   //   },
//   //   quoteLenght: "",
//   //   testText: "",
//   // },
// };

io.on("connection", (socket) => {
  console.log("A User Connected:", socket.id);

  socket.on("createRoom", (quoteLength) => {
    const roomId = `${Math.floor(1000 + Math.random() * 9000)}`;

    clientRooms[socket.id] = roomId;
    roomState[roomId] = {
      players: {
        playerOne: {
          id: socket.id,
        },
      },
      quoteLenght: quoteLength ? quoteLength : "short",
    };

    socket.join(roomId);
    socket.emit("roomJoined", roomId);
    console.log(`User ${socket.id} created and joind room: ${roomId}`);
    console.log(roomState[roomId]);
    io.to(roomId).emit("room-state", roomState[roomId]);
  });

  socket.on("joinRoom", (roomID) => {
    const rooms = io.sockets.adapter.rooms;

    if (
      rooms.has(roomID) &&
      rooms.get(roomID).size !== 2 &&
      roomState.hasOwnProperty(roomID)
    ) {
      clientRooms[socket.id] = roomID;
      roomState[roomID].players.playerTwo = {
        id: socket.id,
      };

      socket.join(roomID);
      // console.log(roomState[roomID]);
      socket.emit("roomJoined", roomID);
      console.log(`A member ${socket.id} joined the room`);
      fetchQuote(roomState[roomID].quoteLenght)
        .then((quote) => {
          roomState[roomID].testText = quote;
          console.log(roomState[roomID]);
          console.log(io.sockets.adapter.rooms);
          io.to(roomID).emit("test-text", quote);
        })
        .then(() => {
          startCountdown(roomID, io);
        })
        .catch((err) => console.log(err));
      console.log(roomState[roomID]);
      io.to(roomID).emit("room-state", roomState[roomID]);
    } else if (rooms.has(roomID) && rooms.get(roomID).size === 2) {
      console.log('"Room is full!"');
      socket.emit("error", "Room is full!");
    } else {
      console.log("Room not found");
      socket.emit("error", "Room not found");
    }
  });

  socket.on("result", (result) => {
    const roomID = clientRooms[socket.id];

    if (!roomID || !roomState[roomID]) {
      console.error("room doesn't exists");
      return;
    }
    const player =
      roomState[roomID].players.playerOne.id === socket.id
        ? "playerOne"
        : "playerTwo";

    const opponentPlayer = player === "playerOne" ? "playerTwo" : "playerOne";
    if (roomState[roomID].players[player]) {
      roomState[roomID].players[player].result = result;
    }
    if (roomState[roomID].players[opponentPlayer]?.result) {
      io.to(roomID).emit("players-result", roomState[roomID].players);
    }
    console.log(roomState[roomID]);
  });
  const handleRoomDisconnect = () => {
    const roomID = clientRooms[socket.id];
    console.log(roomID);
    if (!roomID || !roomState[roomID]) {
      return;
    }

    delete clientRooms[socket.id];
    const player =
      roomState[roomID].players.playerOne.id === socket.id
        ? "playerOne"
        : "playerTwo";
    console.log(roomID, player);
    const opponentPlayerState =
      roomState[roomID]?.players[
        player === "playerOne" ? "playerTwo" : "playerOne"
      ];
    if (!opponentPlayerState || opponentPlayerState?.disconnected) {
      delete roomState[roomID];
    } else {
      roomState[roomID].players[player].disconnected = true;
      io.to(opponentPlayerState.id).emit("opponent-disconnected");
    }
  };

  socket.on("leave-room", handleRoomDisconnect);
  socket.on("disconnect", () => {
    console.log("User Disconnect", socket.id);
    handleRoomDisconnect();
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
