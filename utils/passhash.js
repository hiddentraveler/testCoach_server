import bcrypt from "bcrypt";

const saltRounds = 10;

export async function hashPass(pass) {
  const salt = await bcrypt.genSalt(saltRounds);
  console.log("salt is ", salt);
  return bcrypt.hash(pass, salt);
}

export async function passCompare(plain, hash) {
  return await bcrypt.compare(plain, hash);
}
