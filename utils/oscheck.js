import os from "node:os";
export function pythonPath() {
  switch (os.platform()) {
    case "linux":
      return "utils/python/OMRChecker/venv/bin/python";
      break;
    case "win32":
      return "utils/python/OMRChecker/venv/Scripts/python.exe";
      break;
  }
}
