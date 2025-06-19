let express = require('express');
let cors = require('cors');
const app = express();
const { auth } = require("express-oauth2-jwt-bearer")

app.use(express.static('public'));

//Allow parsing JSON Bodies in Requests
let bodyParser = require('body-parser');
app.use(bodyParser.json());

const dotenv = require('dotenv');
dotenv.config();


app.use(
    cors({
        origin: 'http://localhost:4200', // Explicitly allow Angular requests
        credentials: true // Allow cookies to be sent
    })
);

// Session Middleware
app.use(
    auth(
        {
            audience: "https://grocerygenie.com",
            issuerBaseURL: "https://dev-e1s2hijgylgn4b4l.us.auth0.com/",
        })
)


const shoppingRoutes = require('./shopping/shopping.js');
app.use('/shopping', shoppingRoutes);
const userRoutes = require('./user/user.js');
app.use('/user', userRoutes);



let port = 3000;
app.listen(port);
console.log('Server running at: http://localhost:' + port);