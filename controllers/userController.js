const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");

const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

global.users = [];
async function register(req, res) {
  if (!req.body) req.body = {};
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ message: error.message});
  const { name, email, password } = value;
  const hashedPassword = await hashPassword(password);
  const newUser = {
    name: value.name,
    email: value.email,
    hashedPassword,
  };

  global.users.push(newUser);

  global.user_id = newUser;

  res.status(201).json({
    name: name,
    email: email,
  });
}

async function logon(req, res) {
  const { email, password } = req.body;
  
  global.user_id = null;
  
  const user = global.users.find((user) => {
    return email === user.email;
  });

  const goodCredentials = user && await comparePassword(password, user.hashedPassword);

  if (goodCredentials) {
    global.user_id = user;

    res.status(200).json({
      name: user.name,
      email: user.email,
    });
  } else {
    res.status(401).json({
      message: "Unauthorized",
    });
  }
}

function logoff(req, res) {
  global.user_id = null;

  res.status(200).json({
    message: "Ok",
  });
}

module.exports = {
  register,
  logon,
  logoff,
};
