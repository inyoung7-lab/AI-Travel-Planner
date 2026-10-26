import app from "./app.js";

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`서버 실행중: http://localhost:${port}`);
});
