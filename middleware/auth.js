function auth(req, res) {
    if (!global.user_id) {
        return res.status(401).json({message: "Unauthorized"});
    }
}

module.exports = auth;
