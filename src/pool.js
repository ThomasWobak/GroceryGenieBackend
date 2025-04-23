const { Pool } = require("pg");
let cfg = require("./config.json");

const pool = new Pool({
    user: cfg.database.user,
    host: cfg.database.host,
    database: cfg.database.db,
    password: cfg.database.password,
    port: 5432,
});

module.exports = pool;