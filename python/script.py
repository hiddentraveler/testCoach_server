import sys
import json


def log(msg):
	jsonData = {"type": "log", "data": msg}
	print(json.dumps(jsonData))

def sendData(data):
	jsonData = {"type": "data", "data": data}
	print(json.dumps(jsonData))


log("Python Script Started")

# simple JSON echo script
for line in sys.stdin:
	sendData(json.loads(line))

log("Python Script Ended")
