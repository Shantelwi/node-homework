const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");

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

async function register(req, res, next) {
  if (!req.body) req.body = {};
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ message: "Validation failed", details: error.details});
  const { name, email, password } = value;
  const hashedPassword = await hashPassword(password);

  try {
    const newUser = await prisma.user.create({ 
      data: {
        name,
        email,
        hashedPassword
      }
     });
    global.user_id = newUser.id;
    
  } catch (error) {
    if (error.code === "P2002") return res.status(400).json({message: "Conflict"});
    return next(error);
  }

  res.status(201).json({
    name: name,
    email: email,
  });
}

async function logon(req, res) {
  let { email, password } = req.body;

  email = email.toLowerCase();
  
  global.user_id = null;

  const user = await prisma.user.findUnique({ where: { email } });
  
  const goodCredentials = user && await comparePassword(password, user.hashedPassword);

  if (goodCredentials) {
    global.user_id = user.id;

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
