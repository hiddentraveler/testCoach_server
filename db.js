import mariadb from "mariadb";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker";
import { passCompare } from "./utils/passhash.js";

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
  } else if (!(await passCompare(pass, res[0].pass.toString()))) {
    return { msg: "password does not match", error: 1 };
  } else {
    const { email, username, id } = res[0];
    return { email, username, id, error: 0 };
  }
}

export async function addUsers(email, username, pass) {
  let conn;
  conn = await pool.getConnection();
  const id = faker.string.nanoid(10);
  try {
    const result = await conn.query(
      "INSERT INTO users (id,email,pass,username) VALUES (?,?,?,?)",
      [id, email, pass, username],
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

export async function delTest(testid) {
  let conn;
  conn = await pool.getConnection();
  try {
    const result = await conn.query(
      `DELETE FROM testprivate WHERE testid='${testid}'`,
    );
    console.log("in db_create", result);
    return 0;
  } catch (e) {
    console.log("error in db_create:", e.errno);
    return "error in deleting the test";
  } finally {
    conn.end();
  }
}

export async function setTest(teacherid, testname, ansArr) {
  let conn;
  conn = await pool.getConnection();
  const testid = faker.string.nanoid(10);
  let answers = { ans: ansArr };
  try {
    const result = await conn.query(
      "INSERT INTO testpublic (testid,teacherid,testname,ans) VALUES (?,?,?,?)",
      [testid, teacherid, testname, answers],
    );
    console.log("in db_create", result);
    return 0;
  } catch (e) {
    console.log("error in db_create:", e.errno);
    console.log(e);
    return "error in inserting the data";
  } finally {
    conn.end();
  }
}

export async function getTestPrivate(userid) {
  let conn;
  conn = await pool.getConnection();
  try {
    const result = await conn.query(
      `SELECT * FROM testprivate WHERE userid='${userid}'`,
    );
    console.log("available public test:", result);
    return result;
  } catch (e) {
    console.log("error in db_create:", e.errno);
    console.log(e);
    return "error in inserting the data";
  } finally {
    conn.end();
  }
}

export async function getTestPublicAll() {
  let conn;
  conn = await pool.getConnection();
  try {
    const result = await conn.query(`SELECT * FROM testpublic `);
    console.log("available public test:", result);
    return result;
  } catch (e) {
    console.log("error in db_create:", e.errno);
    console.log(e);
    return "error in inserting the data";
  } finally {
    conn.end();
  }
}

export async function getTestPublic(testid) {
  let conn;
  conn = await pool.getConnection();
  try {
    const result = await conn.query(
      `SELECT * FROM testpublic WHERE testid='${testid}'`,
    );
    console.log("available public test:", result);
    return result;
  } catch (e) {
    console.log("error in db_create:", e.errno);
    console.log(e);
    return "error in inserting the data";
  } finally {
    conn.end();
  }
}

export async function submitTestPublic(
  userid,
  testid,
  testname,
  responseJson,
  totalque,
  wrong,
  correct,
) {
  let conn;
  conn = await pool.getConnection();

  const responses = JSON.stringify(responseJson);
  try {
    const result = await conn.query(
      "INSERT INTO testpubsub (testid,userid,testname,responses,totalque,wrong,correct) VALUES (?,?,?,?,?,?,?)",
      [testid, userid, testname, responses, totalque, wrong, correct],
    );
    console.log("in db_create", result);
    return 0;
  } catch (e) {
    console.log(e);
    console.log("error in db_create:", e.errno);
    return "error in inserting the data";
  } finally {
    conn.end();
  }
}

export async function submitTestPrivate(
  userid,
  testname,
  responseJson,
  ansArr,
  totalque,
  wrong,
  correct,
) {
  let conn;
  conn = await pool.getConnection();
  let answers = { ans: ansArr };
  const testid = faker.string.nanoid(10);

  const responses = JSON.stringify(responseJson);
  answers = JSON.stringify(answers);
  try {
    const result = await conn.query(
      "INSERT INTO testprivate (testid,userid,testname,responses,answers,totalque,wrong,correct) VALUES (?,?,?,?,?,?,?,?)",
      [testid, userid, testname, responses, answers, totalque, wrong, correct],
    );
    console.log("in db_create", result);
    return 0;
  } catch (e) {
    console.log(e);
    console.log("error in db_create:", e.errno);
    return "error in inserting the data";
  } finally {
    conn.end();
  }
}

export async function dashboard(userid) {
  let conn;
  conn = await pool.getConnection();
  try {
    const result = conn.query(`SELECT *
FROM testpubsub
WHERE testid IN 
(select testid from testpublic where teacherid='${userid}')`);
    return result;
  } catch (e) {
    console.log(e);
    return "error in getting dashboard data";
  } finally {
    conn.end;
  }
}
