//Import express.js module and create its variable.
import express from "express";
import { dashboard, getTestPrivate, getTestPublicAll } from "./db.js";
import authRouter from "./routes/auth.js";
import testRouter from "./routes/tests.js";
import cors from "cors";

const port = 8000;

const app = express();

// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*"); // watch it
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept",
//   );
//   next();
// });

app.use(express.json());
app.use(cors())
app.use(express.urlencoded({ extended: true }));
app.use(authRouter);
app.use(testRouter);
app.use("/uploads", express.static("uploads"));

app.get("/", async function (req, res) {
  const userid = req.body.userid;
  let resultPrivate;
  if (userid) {
    resultPrivate = await getTestPrivate(userid);
  }
  const resultPublic = await getTestPublicAll();
  res.json({ testPublic: resultPublic, testprivate: resultPrivate });
});

app.get("/dashboard", async function (req, res) {
  const userid = req.body.userid;
  const result = await dashboard(userid);
  console.log(result);
  res.json({ all: result });
});

app.listen(port, function () {
  console.log(`server is listening at port ${port}...`);
});
