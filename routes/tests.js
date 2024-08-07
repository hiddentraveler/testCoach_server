import { PythonShell } from "python-shell";
import { pythonPath } from ".././utils/oscheck.js";
import { csvConvert } from ".././utils/csvparse.js";
import cors from "cors";
import multer from "multer";
import { faker } from "@faker-js/faker";
import path from "path";
import fse from "fs-extra";
import { Router } from "express";
import { createReadStream } from 'fs';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

import {
  getTestPublic,
  setTest,
  submitTestPublic,
  submitTestPrivate,
} from ".././db.js";

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, faker.string.nanoid(10) + path.extname(file.originalname));
  },
});


const upload = multer({ storage: storage });

router.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  }),
);

router.post("/upload", upload.single("file"), function (req, res) {
  const filePath = req.file.path;
  const fileName = req.file.filename;
  const testname = req.body.testname;
  const userid = req.body.userid;
  const testpublic = req.body.testpublic;
  const ansArr = JSON.parse(req.body.ansarr);

  console.log("testpublic", testpublic);
  const testid = req.body.testid;
  console.log(`File(${fileName}) uploaded to ${filePath}`);

  res.json({ msg: "file uploaded", error: 0 });

  // processing the uploaded file further
  processUploadedFile(
    fileName,
    filePath,
    testid,
    testpublic,
    userid,
    testname,
    ansArr,
  );
});

router.post("/bulkeval", upload.fields([{ name: "inputs" }, { name: "csv", maxCount: 1 }]), async (req, res) => {
  const uploadedImages = req.files["inputs"];
  const uploadedAnswerKey = req.files["csv"][0]
  console.log(uploadedAnswerKey);

  // processing the uploaded file further
  try {
    const resultCSVFilePath = await processBulkEvaluation(uploadedImages, uploadedAnswerKey);

    if (resultCSVFilePath !== "") {
      res.download(resultCSVFilePath)
    } else {
      res.status(500).send('Error in evaluation');
    }
  } catch (error) {
    console.log(error);
    res.status(500).send('Error processing files');
  }
});

const processUploadedFile = (
  fileName,
  URI,
  testid,
  testpublic,
  userid,
  testname,
  ansArr,
) => {
  console.log("processing file: " + URI);

  // TODO: logic to check if its a valid image

  try {
    let tempImgFolderName = path.parse(URI).name;

    // copy image to the python OMR input folder
    let srcPath = URI;
    let destPath =
      "./utils/python/storage/inputs/" + tempImgFolderName + "/" + fileName;
    // create temp folder in input directory and image
    fse.copySync(srcPath, destPath, { overwrite: true }); // overwrite if already exists
    console.log(
      "successfully copy image file from " + srcPath + " to " + destPath,
    );

    srcPath = "./utils/python/storage/template";
    destPath = "./utils/python/storage/inputs/" + tempImgFolderName;
    // copy template files to newly created temp folder
    fse.copySync(srcPath, destPath);
    console.log(
      "successfully copy template files from " + srcPath + " to " + destPath,
    );

    // run the python script with the temp folder name
    let inputPath = destPath;
    let outputPath = "./utils/python/storage/outputs/" + tempImgFolderName;
    runPythonScript(inputPath, outputPath)
      .then(() => {
        console.log("Python Script Executed Successfully");

        // TODO: check if results are valid or something..

        console.log("Starting processing results");
        // process the results from the python script
        processResults(
          fileName,
          URI,
          testid,
          testpublic,
          userid,
          testname,
          ansArr,
        );
      })
      .catch((err) => {
        console.error(err);
      });
  } catch (err) {
    console.error(err);
  }
};
const processBulkEvaluation = async (files, uploadedAnswerKey) => {
  let resultCSVFilePath = "";
  const bulk_omr_input_folder_name = "BULK_OMR_INPUT";
  const bulk_omr_output_folder_name = "BULK_OMR_OUTPUT";

  // TODO: clear the bulk input and output folder
  function removeBulkInputOutputFolders() {
    fse.removeSync("./utils/python/storage/" + bulk_omr_input_folder_name);
    fse.removeSync("./utils/python/storage/" + bulk_omr_output_folder_name);
    console.log("successfully removed bulk input and output folders");

  }
  removeBulkInputOutputFolders();

  try {
    files.forEach(file => {
      // move image to the python OMR input folder
      let srcPath = file.path;
      let destPath = "./utils/python/storage/" + bulk_omr_input_folder_name + "/" + file.filename;
      fse.moveSync(srcPath, destPath, { overwrite: true }); // overwrite if already exists
      console.log("successfully moved image file from " + srcPath + " to " + destPath);
    });

    // copy answer_key.csv to bulk_omr_input_folder
    let srcPath = uploadedAnswerKey.path;
    let destPath = "./utils/python/storage/" + bulk_omr_input_folder_name + "/answer_key.csv";
    fse.copySync(srcPath, destPath, { overwrite: true }); // overwrite if already exists
    console.log("successfully copy answer_key.csv from " + srcPath + " to " + destPath);

    // copy template files to bulk_omr_input_folder
    srcPath = "./utils/python/storage/template";
    destPath = "./utils/python/storage/" + bulk_omr_input_folder_name;
    fse.copySync(srcPath, destPath);
    console.log("successfully copy template files from " + srcPath + " to " + destPath);

    // generate evaluate.json in bulk_omr_input_folder
    let evaluateJsonPath = "./utils/python/storage/" + bulk_omr_input_folder_name + "/evaluation.json";
    let evaluateJsonData = {
      "source_type": "csv",
      "options": {
        "answer_key_csv_path": "answer_key.csv",
        "should_explain_scoring": true
      },
      "marking_schemes": {
        "DEFAULT": {
          "correct": "1",
          "incorrect": "0",
          "unmarked": "0"
        }
      }
    };
    fse.writeJsonSync(evaluateJsonPath, evaluateJsonData, { spaces: 2 });

    // run the python script to check the OMR
    let inputPath = destPath;
    let outputPath = "./utils/python/storage/" + bulk_omr_output_folder_name;
    await runPythonScript(inputPath, outputPath);

    console.log("Python Script Executed Successfully");


    // TODO: filter the result csv and send the results to the frontend
    // find all the csv files in the output/Results folder
    let resultsFileName = "";
    let directoryPath = "./utils/python/storage/" + bulk_omr_output_folder_name + "/Results";
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

    if (resultsFileName !== "") {

      await filterCsv(
        "./utils/python/storage/" + bulk_omr_output_folder_name + "/Results/" + resultsFileName, "./utils/python/storage/" + bulk_omr_output_folder_name + "/Results/Results.csv")
      resultCSVFilePath = "./utils/python/storage/" + bulk_omr_output_folder_name + "/Results/Results.csv";
    }
  } catch (err) {
    console.error(err);
  }

  return resultCSVFilePath
};

async function resultSubmitPrivate(filePath, userid, testname, ansArr) {
  console.log("results.csv file path is ", filePath);
  const responseJson = csvConvert(filePath, ansArr);

  function convertLetterToNumber(str) {
    const start = 96; // "a".charCodeAt(0) - 1
    const len = str.length;
    const out = [...str.toLowerCase()].reduce((out, char, pos) => {
      const val = char.charCodeAt(0) - start;
      const pow = Math.pow(26, len - pos - 1);
      return out + val * pow;
    }, 0);
    return out;
  }

  let totalque = 0;
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;

  for (let i = 0; i < ansArr.length; i++) {
    let answer = ansArr[i];
    let response = convertLetterToNumber(responseJson.res[i]);
    if (typeof answer !== "number" || typeof response !== "number") {
      console.log(
        `Exception while evaluating response(${response}) and answer(${answer})`,
      );
    } else if (response === answer) {
      totalque++;
      correct++;
    } else if (response === 0) {
      totalque++;
      unattempted++;
    } else {
      totalque++;
      wrong++;
    }
  }
  console.log(`total questions: ${totalque}`);
  console.log(`correct: ${correct}`);
  console.log(`wrong: ${wrong}`);
  console.log(`unattempted: ${unattempted}`);
  console.log(testname);
  const result = await submitTestPrivate(
    userid,
    testname,
    responseJson,
    ansArr,
    totalque,
    correct,
    wrong,
  );
  console.log(result);
}

async function resultSubmitPublic(filePath, testid, userid, testname) {
  const responseJson = csvConvert(filePath);
  console.log("file path is ", filePath);
  console.log(responseJson);
  const testAnsJson = await getTestPublic(testid);
  const ansArr = testAnsJson[0].ans.ans;
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
  ansArr,
) => {
  console.log("processing results");
  let tempImgFolderName = path.parse(URI).name;
  // making omr results storage folder with the name of the image by faker
  let omrResultStoragePath = "./storage/" + tempImgFolderName;
  fse.ensureDirSync(omrResultStoragePath); // create omrResultStoragePath if it doesn't exist

  let tempOMRInputPath = "./utils/python/storage/inputs/" + tempImgFolderName;
  let tempOMROutputPath = "./utils/python/storage/outputs/" + tempImgFolderName;
  // move omr to the results storage folder
  let srcPath = tempOMRInputPath + "/" + fileName;
  let destPath = omrResultStoragePath + "/OMR.jpg";
  try {
    fse.moveSync(srcPath, destPath, { overwrite: true }); // overwrite if already exists
    console.log("successfully moved OMR from " + srcPath + " to " + destPath);
  } catch (err) {
    console.error(err);
  }

  // move checkedOMR to the storage folder
  srcPath = tempOMROutputPath + "/CheckedOMRs/" + fileName;
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
  let directoryPath = tempOMROutputPath + "/Results";
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
  srcPath = tempOMROutputPath + "/Results/" + resultsFileName;
  destPath = omrResultStoragePath + "/result.csv";
  try {
    fse.moveSync(srcPath, destPath, { overwrite: true }); // overwrite if already exists
    console.log(
      "successfully moved results.csv from " + srcPath + " to " + destPath,
    );
  } catch (err) {
    console.error(err);
  }

  // Deleting temp input and output folders
  fse.removeSync(tempOMRInputPath);
  fse.removeSync(tempOMROutputPath);
  console.log(
    "OMR Processing Temp Folders Deleted at directories:",
    tempOMRInputPath + "and" + tempOMROutputPath,
  );

  if (testpublic == "true") {
    resultSubmitPublic(destPath, testid, userid, testname);
  } else if (testpublic == "false") {
    resultSubmitPrivate(destPath, userid, testname, ansArr);
  }
};

// python script will be executed here
const runPythonScript = (
  inputPath = "utils/python/storage/inputs/",
  outputPath = "utils/python/storage/outputs/",
) => {
  return new Promise((resolve, reject) => {
    console.log("Running python script...");
    let options = {
      pythonPath: pythonPath(),
      mode: "text",
      pythonOptions: ["-u"], // get print results in real-time
      scriptPath: "utils/python/OMRChecker", //If you are having python_test.py script in same folder, then it's optional.
      args: ["-i", inputPath, "-o", outputPath], //An argument which can be accessed in the script using sys.argv[1]
    };

    let pyshell = new PythonShell("main.py", options);

    // sends a message to the Python script via stdin
    // pyshell.send({ name: "Manab", age: 24 });

    // pyshell.on("message", function (message) {
    //   console.log("[Python]", message);
    // });

    // end the input stream and allow the process to exit
    pyshell.end(function (err, code, signal) {
      console.log("The exit code was: " + code);
      if (err) reject(err);
      // resolve the promise
      resolve();
    });
  });
};


async function filterCsv(inputFilePath, outputFilePath) {
  const records = [];

  // Read the input CSV file
  try {
    await new Promise((resolve, reject) => {
      createReadStream(inputFilePath)
        .pipe(csv())
        .on('data', (data) => {
          // Filter and store required columns
          records.push({
            Reg_No: data.Reg_No,
            score: data.score,
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });
  } catch (error) {
    console.error(`Error reading CSV file: ${error.message}`);
    throw error;
  }

  // Write the filtered data to the output CSV file
  const csvWriter = createObjectCsvWriter({
    path: outputFilePath,
    header: [
      { id: 'Reg_No', title: 'Reg_No' },
      { id: 'score', title: 'score' },
    ],
  });

  try {
    await csvWriter.writeRecords(records);
    console.log('Filtered CSV file created successfully.');
  } catch (error) {
    console.error(`Error writing CSV file: ${error.message}`);
    throw error;
  }
}


export default router;
