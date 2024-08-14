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

# References
1. Nodejs Docs: https://nodejs.org/api/all.html
2. Python Docs: https://docs.python.org/3/
3. Opencv docs: https://docs.opencv.org/4.x/index.html
4. React Reference: https://react.dev/reference/react
5. Maria DB docs: https://mariadb.org/documentation/
6. Bycrypt Readme: https://github.com/dcodeIO/bcrypt.js/blob/master/README.md
7. ECMAScript / Javascript Language Specification: https://262.ecma-international.org/7.0/
