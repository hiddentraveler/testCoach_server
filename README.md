# Setup

## Prerequisite
- Nodejs
- Python3
- Git

## Git clone
```
git clone https://github.com/hiddentraveler/testCoach_server
```

## Install locally
```
cd testCoach_server
node install
```

## setup python virtual enviornments

For Windows:
```
cd utils\python\OMRChecker
python -m venv venv
```

For Linux:
```
cd utils/python/OMRChecker
python -m venv venv
```

## install pip dependencies in virtual enviornments 

For Windows:
```
venv\Scripts\activate.bat
pip install -r requirements.txt
```

For Linux:
```
source venv/bin/activate
pip install -r requirements.txt
```

## start the server
To start the server go to Root directory and run :
```
npm start
```
