import fs from "fs";

export function csvConvert(filePath, ansArr) {
  console.log("Csv Converter Launched");
  try {
    const data = fs.readFileSync(filePath, "UTF-8").toString();

    const lines = data.split("\n");

    const queArr = [];
    const responseArr = [];

    const ques = lines[0].split(",");
    ques.shift();
    ques.shift();
    ques.shift();
    ques.shift();
    ques.shift();
    ques.forEach((que) => {
      que = que.replace(/^"(.*)"$/, "$1");
      queArr.push(que);
    });

    const response = lines[1].split(",");
    response.shift();
    response.shift();
    response.shift();
    response.shift();
    response.shift();
    response.forEach((res) => {
      res = res.replace(/^"(.*)"$/, "$1");
      responseArr.push(res);
    });

    // if (queArr.length != ansArr.length) {
    //   return `que length(${queArr.length}) and answerlength(${ansArr.length}) isn't same`;
    // }

    let responseJson = { que: queArr, res: responseArr };
    // responseJson = JSON.stringify(responseJson);

    console.log("response after csvConvert: ", responseJson);
    return responseJson;
  } catch (err) {
    console.error("error at csvConvert", err);
  }
}
