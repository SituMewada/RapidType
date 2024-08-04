import { io } from "./app.js";
export function startCountdown(roomID) {
  const startIn = 5000;
  const startAt = new Date().getTime() + startIn;

  io.to(roomID).emit("typing-start-in", startIn);
  const intreval = setInterval(() => {
    const remainingTime = startAt - new Date().getTime();

    if (remainingTime > 0) {
      io.to(roomID).emit("typing-start-in", remainingTime);
    } else {
      io.to(roomID).emit("typing-started");
      clearInterval(intreval);
    }
  }, 1000);
}

export async function fetchQuote(length = "short") {
  // const res = await fetch(
  //   `https://api.quotable.io/random${
  //     length === "short"
  //       ? "?maxLength=100"
  //       : length === "medium"
  //       ? "?minLength=101&maxLength=250"
  //       : length === "long"
  //       ? "?minLength=251"
  //       : ""
  //   }`
  // );
  const res = await fetch(`https://api.quotable.io/random`);
  const data = await res.json();
  console.log(data);

  return data.content;
}
