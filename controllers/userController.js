global.users = [];
function register(req, res) {
    const {name, email, password} = req.body;
    const newUser = {
        name: name,
        email: email,
        password: password
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