import mariadb from "mariadb";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker";

dotenv.config();

const pool = mariadb.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  connectionLimit: 5,
});

export async function getUsers(email_id, pass) {
  let conn;
  conn = await pool.getConnection();
  const res = await conn.query(`SELECT * FROM users where email='${email_id}'`);
  conn.end();
  console.log(email_id, pass, res[0]);
  if (!res[0]) {
    return { msg: "email does not exist", error: 1 };
  } else if (res[0].pass !== pass) {
    return { msg: "password does not match", error: 1 };
  } else {
    const { avatar, email, username, id } = res[0];
    return { avatar, email, username, id, error: 0 };
  }
}

export async function addUsers(email, pass) {
  let conn;
  conn = await pool.getConnection();
  const username = faker.internet.userName();
  const avatar = faker.image.avatarLegacy();
  const id = faker.string.nanoid(10);
  try {
    const result = await conn.query(
      "INSERT INTO users (id,avatar,email,pass,username) VALUES (?,?,?,?,?)",
      [id, avatar, email, pass, username],
    );
    console.log("in db_create", result);
    return 0;
  } catch (e) {
    console.log("error in db_create:", e.errno);
    switch (e.errno) {
      case 1062:
        return 1062;
      case 1048:
        return 1048;
    }
    return "error in inserting the data";
  } finally {
    conn.end();
  }
}
