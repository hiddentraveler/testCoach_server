//Import express.js module and create its variable.
import express from "express";
import cors from "cors";
import multer from "multer";
import { faker } from "@faker-js/faker";
import path from "path";
import fse from "fs-extra";
import {
  addUsers,
  getTestPublic,
  getUsers,
  setTest,
  submitTestPublic,
  submitTestPrivate,
} from "./db.js";
import { hashPass } from "./utils/passhash.js";
import { PythonShell } from "python-shell";
import { pythonPath } from "./utils/oscheck.js";
import { csvConvert } from "./utils/csvparse.js";

const port = 8000;

const app = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, faker.string.nanoid(10) + path.extname(file.originalname));
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

app.post("/upload", upload.single("file"), function (req, res) {
  const filePath = req.file.path;
  const fileName = req.file.filename;
  const testname = req.body.testname;
  const userid = req.body.userid;
  const testpublic = req.body.testpublic;
  console.log("testpublic", testpublic);
  const testid = req.body.testid;
  console.log(`File(${fileName}) uploaded to ${filePath}`);

  res.json({ msg: "file uploaded", error: 0 });

  // processing the uploaded file further
  processUploadedFile(fileName, filePath, testid, testpublic, userid, testname);
});

app.post("/settest", async function (req, res) {
  const testname = req.body.testname;
  const teacherid = req.body.teacherid;
  const ansArr = req.body.ansArr;
  const result = await setTest(teacherid, testname, ansArr);
  res.json(result);
});

const processUploadedFile = (
  fileName,
  URI,
  testid,
  testpublic,
  userid,
  testname,
) => {
  console.log("processing file: " + URI);

  // TODO: logic to check if its a valid image

  // TODO: cleanup the python OMR processing folders

  // copy image to the python OMR input folder
  let srcPath = URI;
  let destPath = "./utils/python/storage/inputs/" + fileName;
  try {
    fse.copySync(srcPath, destPath, { overwrite: true }); // overwrite if already exists
    console.log("successfully copy file from " + srcPath + " to " + destPath);

    // run the python script
    runPythonScript()
      .then(() => {
        console.log("Python Script Executed Successfully");

        // TODO: check if results are valid or something..

        console.log("Starting processing results");
        // process the results from the python script
        processResults(fileName, URI, testid, testpublic, userid, testname);
      })
      .catch((err) => {
        console.error(err);
      });
  } catch (err) {
    console.error(err);
  }
};

async function resultSubmitPrivate(filePath, userid, testname) {
  const responseJson = csvConvert(filePath);
  console.log("file path is ", filePath);
  console.log(responseJson.ans);
  const ansArr = [];
  console.log(ansArr.length);
  let correct = 0;
  let wrong = 0;
  for (let i = 0; i < ansArr.length; i++) {
    if (ansArr[i] === responseJson.ans[i]) {
      correct++;
    } else if (
      responseJson.ans[i] !== ansArr[i] &&
      responseJson.ans[i] !== ""
    ) {
      wrong++;
    }
  }
  console.log(`correct: ${correct}`);
  console.log(`wrong: ${wrong}`);
  console.log(testname);
  const result = await submitTestPrivate(
    userid,
    testname,
    responseJson,
    ansArr,
    correct,
    wrong,
  );
  console.log(result);
}

async function resultSubmitPublic(filePath, testid, userid, testname) {
  const responseJson = csvConvert(filePath);
  console.log("file path is ", filePath);
  console.log(responseJson.ans);
  const ansArr = await getTestPublic(testid);
  const totalque = ansArr.length;
  console.log(ansArr.length);
  let correct = 0;
  let wrong = 0;
  for (let i = 0; i < ansArr.length; i++) {
    if (ansArr[i] === responseJson.ans[i]) {
      correct++;
    } else if (
      responseJson.ans[i] !== ansArr[i] &&
      responseJson.ans[i] !== ""
    ) {
      wrong++;
    }
  }
  console.log(`correct: ${correct}`);
  console.log(`wrong: ${wrong}`);
  console.log(testname);
  const result = await submitTestPublic(
    userid,
    testid,
    testname,
    responseJson,
    totalque,
    correct,
    wrong,
  );
  console.log(result);
}

const processResults = (
  fileName,
  URI,
  testid,
  testpublic,
  userid,
  testname,
) => {
  console.log("processing results");
  // making omr storage folder with the name of the image by faker
  let omrResultStoragePath = "./storage/" + path.parse(URI).name;
  fse.ensureDirSync(omrResultStoragePath);

  // move omr to the storage folder
  let srcPath = "./utils/python/storage/inputs/" + fileName;
  let destPath = omrResultStoragePath + "/OMR.jpg";
  try {
    fse.moveSync(srcPath, destPath, { overwrite: true }); // overwrite if already exists
    console.log("successfully moved OMR from " + srcPath + " to " + destPath);
  } catch (err) {
    console.error(err);
  }

  // move checkedOMR to the storage folder
  srcPath = "./utils/python/storage/outputs/CheckedOMRs/" + fileName;
  destPath = omrResultStoragePath + "/checkedOMR.jpg";
  try {
    fse.moveSync(srcPath, destPath, { overwrite: true }); // overwrite if already exists
    console.log(
      "successfully moved checkedOMR from " + srcPath + " to " + destPath,
    );
  } catch (err) {
    console.error(err);
  }

  // find all the csv files in the output/Results folder
  let resultsFileName = "";
  let directoryPath = "./utils/python/storage/outputs/Results";
  try {
    const files = fse.readdirSync(directoryPath);
    if (!Array.isArray(files)) {
      console.log(files);
      return console.error(
        "Expected files to be an array, but got:",
        typeof files,
      );
    }
    const csvFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".csv",
    );
    console.log("CSV files:", csvFiles);

    // TODO: need proper way to select the latest csv file
    resultsFileName = csvFiles[0];
  } catch (err) {
    console.error("Unable to scan directory:", err);
  }

  // move results.csv to the storage folder
  srcPath = "./utils/python/storage/outputs/Results/" + resultsFileName;
  destPath = omrResultStoragePath + "/result.csv";
  try {
    fse.moveSync(srcPath, destPath, { overwrite: true }); // overwrite if already exists
    console.log(
      "successfully moved results.csv from " + srcPath + " to " + destPath,
    );
  } catch (err) {
    console.error(err);
  }
  if (testpublic == "true") {
    resultSubmitPublic(destPath, testid, userid, testname);
  } else if (testpublic == "false") {
    resultSubmitPrivate(destPath, userid, testname);
  }
};

// python script will be executed here
const runPythonScript = () => {
  return new Promise((resolve, reject) => {
    console.log("Running python script...");
    let options = {
      pythonPath: pythonPath(),
      mode: "text",
      pythonOptions: ["-u"], // get print results in real-time
      scriptPath: "utils/python/OMRChecker", //If you are having python_test.py script in same folder, then it's optional.
      args: [
        "-i",
        "utils/python/storage/inputs/",
        "-o",
        "utils/python/storage/outputs/",
      ], //An argument which can be accessed in the script using sys.argv[1]
    };

    let pyshell = new PythonShell("main.py", options);

    // sends a message to the Python script via stdin
    // pyshell.send({ name: "Manab", age: 24 });

    pyshell.on("message", function (message) {
      console.log("[Python]", message);
    });

    // end the input stream and allow the process to exit
    pyshell.end(function (err, code, signal) {
      console.log("The exit code was: " + code);
      if (err) reject(err);
      // resolve the promise
      resolve();
    });
  });
};

app.listen(port, function () {
  console.log(`server is listening at port ${port}...`);
});
