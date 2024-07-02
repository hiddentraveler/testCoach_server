import fs from "fs";

export function csvConvert(filePath) {
  try {
    const data = fs.readFileSync(filePath, "UTF-8").toString();

    const lines = data.split("\n");

    const queArr = [];
    const ansArr = [];

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

    const answers = lines[1].split(",");
    answers.shift();
    answers.shift();
    answers.shift();
    answers.shift();
    answers.shift();
    answers.forEach((ans) => {
      ans = ans.replace(/^"(.*)"$/, "$1");
      ansArr.push(ans);
    });

    if (queArr.length != ansArr.length) {
      return "que length and answerlength isn't same";
    }

    let answerJson = { que: queArr, ans: ansArr };
    // answerJson = JSON.stringify(answerJson);

    return answerJson;
  } catch (err) {
    console.error(err);
  }
}
