var express = require('express');
var uuid = require('node-uuid');
var MongoClient = require('mongodb').MongoClient;
var bodyParser = require('body-parser');
var url = "mongodb://localhost:27017/getmyparking";
var bcrypt = require('bcrypt');
var database;
const saltRounds = 10;
/*Application level map to cache the entry for each email id , so that the request is unique*/
var mapList = [];
var listOfEmail = [];
/**Mongo db collection which will store the email id and encrpted password.
Database Name: pwdDb
CollectionName : signIn**/
MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    console.log("Database created!");
    database = db.db("getmyparking");
    database.createCollection("signIn", function (err, res) {
        if (err) throw err;
        console.log(" signIn Collection created!");
        // db.close();
    });
});
var app = express();
app.use(bodyParser.json())
    /**Forgotpassword api will accept json Object 
    Method :Post
    json Request :{"email":"abc@hotmail.com"}
    Response will the password reset url : http://localhost:8081/restMyPassword?token=10bcfcf0-2f45-11e8-a924-1b580f9d577e
    ..............................................
    Each request will create a unique url for passwords update and will have only one entry for email id and will be unique.
    **/
app.post('/forgotPwd', function (req, res) {
        var dateTime = Date();
        console.log("request reached!");
        var pwdRequest = req.body.email;
        var uuid1 = uuid.v1();
        var map = {};
        map.emailId = pwdRequest;
        map.identifier = uuid1;
        map.timestamp = dateTime;
        var completeUpdatedList = [];
        varcompleteUpdatedList = addLatestToList(map, mapList, listOfEmail);
        console.log(JSON.stringify(mapList));
        res.send("Reset password Url:http://localhost:8081/restMyPassword?token=" + map.identifier);
    })
    /**
    Reset password will reset the password with the url provided.
    Method: POST
    JSON request:  {"email":"abc@hotmail.com","password":"abc","confirm_password":"abc"}
    RESPONSE: if there is mismatch , message will be returned to the user to reenter the password .
            : if there is correct match between the confirm_password and password: then the email id and password are stored in the signIn COLLECTION in encryted form.
    **/
app.post('/restMyPassword', function (req, res) {
    var password_change = req.body;
    var token = req.param('token');
    var password = password_change.password;
    var confirm_pwd = password_change.confirm_password;
    var email = password_change.email;
    if (password == confirm_pwd) {
        removeFromListAndMapOnSuccess(email)
        console.log(JSON.stringify(mapList));
        /*Once password data is found sucessfull, encrpyt the passowrd and same email and password to db*/
        bcrypt.genSalt(saltRounds, function (err, salt) {
            bcrypt.hash(password, salt, function (err, hash) {
                var dbEntry = {};
                dbEntry.email = email;
                dbEntry.passwordHash = hash;
                database.collection("signIn").insertOne(dbEntry, function (err, res) {
                    if (err) throw err;
                    console.log("1 document inserted into signIn Collection");
                    //db.close();
                });
                // Store hash in your password DB.
            });
        });
        res.send("Successfully updating password");
    }
    else {
        res.send("Password mismatch for current and new passwod.PLease re-enter password!");
    }
    console.log('got request to update my password email id:' + "token" + token);
})
var addLatestToList = function (map, mapListComplete, listOfEmail) {
    if (listOfEmail.indexOf(map.emailId) == -1) {
        listOfEmail.push(map.emailId);
        mapListComplete.push(map);
        return mapListComplete;
    }
    else {
        for (var i in mapList) {
            if (mapListComplete[i].emailId == map.emailId) {
                mapListComplete[i].identifier = map.identifier;
                mapListComplete[i].timestamp = map.timestamp;
            }
        }
    }
    return mapListComplete;
}
var removeFromListAndMapOnSuccess = function (email) {
    for (var i = 0; i < mapList.length; i++) {
        if (mapList[i].emailId == email) {
            mapList.splice(i, 1);
            console.log("Removing entry from the complete object list");
        }
    }
    for (var i = 0; i < listOfEmail.length; i++) {
        if (listOfEmail[i] == email) {
            listOfEmail.splice(i, 1);
            console.log("Removing entry from the email id list");
        }
    }
}
var server = app.listen(8081, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)
})
