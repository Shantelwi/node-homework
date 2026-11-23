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
  if (error)
    return res
      .status(400)
      .json({ message: "Validation failed", details: error.details });
  const { name, email, password } = value;
  const hashedPassword = await hashPassword(password);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          hashedPassword,
        },
      });
      await tx.task.createMany({
        data: [
          {
            title: "Complete your profile",
            userId: user.id,
            priority: "medium",
          },
          {
            title: "Add your first task",
            userId: user.id,
            priority: "high",
          },
          {
            title: "Explore the app",
            userId: user.id,
            priority: "low",
          },
        ],
      });
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: user.id
        },
      })
      return { user, welcomeTasks };
    });

    console.log("Welcome tasks:", result.welcomeTasks);
    console.log("Is array:", Array.isArray(result.welcomeTasks));
    
    global.user_id = result.user.id;
    res.status(201).json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
  } catch (error) {
    if (error.code === "P2002")
      return res.status(400).json({ message: "Conflict" });
    return next(error);
  }
}

async function logon(req, res) {
  let { email, password } = req.body;

  email = email.toLowerCase();

  global.user_id = null;

  const user = await prisma.user.findUnique({ where: { email } });

  const goodCredentials =
    user && (await comparePassword(password, user.hashedPassword));

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

async function show(req, res) {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  if (userId !== global.user_id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      Task: {
        where: { isCompleted: false },
        select: {
          id: true,
          title: true,
          priority: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.status(200).json(user);
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
  show,
  logoff,
};
