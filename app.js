require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const Users = require('./models/users');
var jwt = require('jsonwebtoken');
const app = express();

app.use(express.urlencoded({
    extended: true
}));

app.use(express.json())

// Connect to mongodb
const dbURI = "mongodb+srv://amankdl:qwertypoi@learnnode.0wehc.mongodb.net/learnnode?retryWrites=true&w=majority";
mongoose.connect(dbURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then((result) => {
        app.listen(3000, () => {
            console.log("Server started");
        });
        console.log("connected to db");
    })
    .catch((error) => {
        console.log(error);
    });

// to handle user registration.
app.post('/register', (req, res) => {
    const providedFields = Object.keys(req.body);

    ['name','email','phone','password'].forEach(field => {
        if(!providedFields.includes(field)){
            res.json({
                status: false,
                message: `${field} not exists.`
            })
        }
    });
    
    const user = new Users(req.body);
    user.setPassword(req.body.password);
    user.save()
        .then((result) => {
            res.json({
                status: true,
                message: "success",
                data: result
            })
        })
        .catch((error) => {
            res.json({
                status: false,
                message: error.code == "11000" ? "Email or number already exsists." : error
            })
        });
});

// to handle user login
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username) {
        return res.json({
            status: false,
            message: "username not provided",
        })
    } else if (!password) {
        return res.json({
            status: false,
            message: "password not provided",
        })
    }

    const usernameKey = validateEmail(username) ? 'email' : 'phone';
    var data = {};
    data[usernameKey] = username;

    Users.findOne(data).exec(function (error, user) {
        if (error){
            return res.json({
                status: false,
                message: "Somethig went wrong on our side, we are fixing.",
            })
        }

        if (user == null) {
            return res.json({
                status: false,
                message: "Invalid email."
            })
        } else {
            if (user.validPassword(req.body.password)) {
                const userfortoken = { name: username };
                const accessToken = jwt.sign(userfortoken, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
                return res.json({
                    status: true,
                    accessToken,
                    message: "success",
                    data: user
                });
            } else {
                return res.json({
                    status: false,
                    message: "Invalid password."
                });
            }
        }
    });
});

app.post('/details', authenticateToken, (req, res)=>{
    res.send("Jwt working....");
});

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function authenticateToken(req, res, next){
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(token == null) res.json({status: false, message: "Invalid auth token."});

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decodedToken) => {
        if(error) res.json({status: false, message: "Invalid auth token."});
        req.authenticateToken = decodedToken;
        next();
    });
}