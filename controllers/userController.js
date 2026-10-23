const crypto = require("crypto");
const util = require("util");


global.users = [];
function register(req, res) {
    const {name, email, hashPassword} = req.body;
    const newUser = {
        name,
        email,
        hashPassword
    }
    
    global.users.push(newUser);
    
    global.user_id = newUser;
    
    res.status(201).json({
        "name": name,
        "email": email
    });
};

function logon (req, res) {
    const {email, password} = req.body;
    
    global.user_id = null;
    
    const user = global.users.find ((user) => {
        return email === user.email  && password === user.password;
    })
    
    if ( user ) {
        global.user_id = user;
        
        res.status(200).json({
            "name": user.name,
            "email": user.email
        })
    }else {
        res.status(401).json({
            "message": 'Unauthorized'
        });
    }
}

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

function logoff (req, res) {
    global.user_id = null;

    res.status(200).json ({
        "message": "Ok"
    });
}

module.exports = {
  register,
  logon,
  logoff
};