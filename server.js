import express from "express";
import cors from "cors";
import multer from "multer";
import { faker } from "@faker-js/faker";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { addUsers, getUsers } from "./db.js";

const port = 8000;

const app = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname +
        "-" +
        faker.string.nanoid(10) +
        path.extname(file.originalname),
    );
  },
});

const upload = multer({ storage: storage });

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  }),
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // watch it
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.get("/", async function (req, res) {
  const result = { msg: "hello", error: 0 };
  res.json(result);
});

app.post("/signup", async (req, res) => {
  const email = req.body.email;
  const pass = req.body.pass;
  console.log(email, pass);
  const result = await addUsers(email, pass);
  switch (result) {
    case 0:
      res.json({ msg: "user created", error: 0 });
      break;
    case 1062:
      res.json({ msg: "This email already exists.", error: 1 });
      break;
    case 1048:
      res.json({ msg: "Email field is empty", error: 1 });
      break;
    case "error in inserting the data":
      res.json({ msg: "error in inserting the data", error: 1 });
  }
});

app.post("/login", async function (req, res) {
  const email = req.body.email;
  const pass = req.body.pass;
  if (!email) {
    res.json({ msg: "email field is empty ", error: 1 });
    return 0;
  }
  if (!pass) {
    res.json({ msg: "password field is empty ", error: 1 });
    return 0;
  }

  const result = await getUsers(email, pass);
  res.json(result);
});

app.post("/upload", upload.single("file"), function (req, res) {});

app.listen(port, function () {
  console.log(`server is listening at port ${port}...`);
});
