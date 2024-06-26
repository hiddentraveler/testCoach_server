//Import express.js module and create its variable.
import express from "express";
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
	let options = {
		mode: "json",
		pythonOptions: ["-u"], // get print results in real-time
		scriptPath: "python/", //If you are having python_test.py script in same folder, then it's optional.
		args: [{ name: "Manab", age: 24 }], //An argument which can be accessed in the script using sys.argv[1]
	};

	let pyshell = new PythonShell("script.py", options);

	// sends a message to the Python script via stdin
	pyshell.send({ name: "Manab", age: 24 });

	pyshell.on("message", function (message) {
		// received a message sent from the Python script (a simple "print" statement)
		if (message.type == "data") {
			console.log("Data:", message.data);
		}
		if (message.type == "log") {
			console.log("Log:", message.data);
		}
	});

	// end the input stream and allow the process to exit
	pyshell.end(function (err, code, signal) {
		if (err) throw err;
		console.log("The exit code was: " + code);
	});
};

runPythonScript();

//Creates the server on default port 8000 and can be accessed through localhost:8000
const port = 8000;
app.listen(port, () => console.log(`Server connected to ${port}`));
