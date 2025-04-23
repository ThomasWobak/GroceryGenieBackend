let express = require('express');
let cors = require('cors');
const app = express();

app.use(express.static('public'));

const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const dbPool = require('./pool.js');

//Allow parsing JSON Bodies in Requests
let bodyParser = require('body-parser');
app.use(bodyParser.json());

const checkAuth = require('./auth/auth.js');

app.use(
    cors({
        origin: 'http://localhost:4200', // Explicitly allow Angular requests
        credentials: true // Allow cookies to be sent
    })
);

// Session Middleware
app.use(
    session({
        resave: false,
        saveUninitialized: false,
        store: new pgSession({
            pool: dbPool,
            tableName: 'user_sessions',
            createTableIfMissing: true
        }),
        cookie: {
            maxAge: 1000 * 60 * 60, // 1 hour until cookie expires
            secure: false, // Set to true in production with HTTPS
            httpOnly: true, // Prevent client-side JS access
            sameSite: 'lax' // Prevent CSRF while allowing same-site requests
        },
        secret: 'SomeVeryVerySecretSecret'
    })
);

const loginRoutes = require('./auth/login.js');
app.use('/login', loginRoutes);

const shoppingRoutes = require('./shopping/shopping.js');
app.use('/shopping', shoppingRoutes);
const userRoutes = require('./user/user.js');
app.use('/user', userRoutes);

app.get('/logout', checkAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error logging out.' });
        }
        res.clearCookie('connect.sid'); // Clears session cookie
        return res.status(200).json({ message: 'Logout successful' });
    });
});

let port = 3000;
app.listen(port);
console.log('Server running at: http://localhost:' + port);