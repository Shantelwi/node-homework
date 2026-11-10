const pool = require("./db");

pool
    .query("SELECT current_database(), current_user")
    .then((result) => {
        console.log("Database connection successful!");
        console.log(result.rows[0]);
    })
    .catch((error) => {
        console.error("Database connection failed:", error.message);
    })
    .finally(() => {
        pool.end();
    });