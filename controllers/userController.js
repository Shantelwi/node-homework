const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");

const pool = require("../db/pg-pool");

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
    const newUser = await pool.query(" INSERT INTO users (name, email, hashed_password) VALUES ($1, $2, $3) RETURNING id ", [name, email, hashedPassword]);
    global.user_id = newUser.rows[0].id;
    
  } catch (error) {
    if (error.code === "23505") return res.status(400).json({message: "Conflict"});
    next(error);
  }
  
    

  res.status(201).json({
    name: name,
    email: email,
  });
}

async function logon(req, res) {
  const { email, password } = req.body;
  
  global.user_id = null;

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

  const user = result.rows[0];
  
  const goodCredentials = user && await comparePassword(password, result.rows[0].hashed_password);

  if (goodCredentials) {
    global.user_id = result.rows[0].id;

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
