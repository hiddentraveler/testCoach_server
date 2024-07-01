//Import express.js module and create its variable.
//Import express.js module and create its variable.
import express from "express";
import cors from "cors";
import multer from "multer";
import { faker } from "@faker-js/faker";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { addUsers, getUsers } from "./db.js";
import { hashPass } from "./utils/passhash.js";

const port = 8000;

const app = express();

//Import PythonShell module.
import { PythonShell } from "python-shell";

//Router to handle the incoming request.
app.get("/", (req, res, next) => {
	console.log("getting request");
	//Here are the option object in which arguments can be passed for the python_test.js.
});

// python script will be executed here
const runPythonScript = () => {
	console.log("Running python script...");
	let options = {
		pythonPath: "utils/python/OMRChecker/venv/Scripts/python.exe",
		mode: "text",
		pythonOptions: ["-u"], // get print results in real-time
		scriptPath: "utils/python/OMRChecker", //If you are having python_test.py script in same folder, then it's optional.
		args: ["-i", "utils/python/storage/inputs/", "-o", "utils/python/storage/outputs/"], //An argument which can be accessed in the script using sys.argv[1]
	};

	let pyshell = new PythonShell("main.py", options);

	// sends a message to the Python script via stdin
	// pyshell.send({ name: "Manab", age: 24 });

	pyshell.on("message", function (message) {
		console.log("[Python]", message);
	});

	// end the input stream and allow the process to exit
	pyshell.end(function (err, code, signal) {
		if (err) throw err;
		console.log("The exit code was: " + code);
	});
};

runPythonScript();

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "./uploads");
	},
	filename: function (req, file, cb) {
		cb(null, file.fieldname + "-" + faker.string.nanoid(10) + path.extname(file.originalname));
	},
});

const upload = multer({ storage: storage });

app.use(
	cors({
		origin: ["http://localhost:3000", "http://localhost:5173"],
		credentials: true,
	})
);

app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*"); // watch it
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
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

	console.log(` filePath: ${filePath}\n `);
	res.json({ msg: "file uploaded", error: 0 });

	// if (!fs.existsSync(outputPath)) {
	//   fs.mkdirSync(outputPath, { recursive: true });
	// }
	//
	// exec();
});

app.listen(port, function () {
	console.log(`server is listening at port ${port}...`);
});
