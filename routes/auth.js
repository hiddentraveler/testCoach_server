import { Router } from "express";
import { hashPass } from ".././utils/passhash.js";
import { addUsers, getUsers } from ".././db.js";

const router = Router();

router.post("/signup", async (req, res) => {
  const email = req.body.email;
  const pass = await hashPass(req.body.pass);
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

router.post("/login", async function (req, res) {
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

export default router;
