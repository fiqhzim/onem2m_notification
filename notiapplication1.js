///////////////Parameters/////////////////
var cseUrl = "http://127.0.0.1:7579";
var aeId = "S" + "notiapplication";
var aeName = "notiapplication";
var aeIp = "127.0.0.1";
var aePort = 4000;
var sub_Container = "/Mobius/lumi/DATA"; //
var threshold = 300;
var count = 0;
var arr_container = [];
arr_container[count] = {};
arr_container[count++].path = "/Mobius/lamp/COMMAND";
arr_container[count] = {};
arr_container[count++].path = "/Mobius/presence/COMMAND"; // Path for presence sensor
arr_container[count] = {};
arr_container[count++].path = "/Mobius/buzzer/COMMAND"; // Path for buzzer
//////////////////////////////////////////

var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();

app.use(bodyParser.json());
app.listen(aePort, function () {
    console.log("AE Notification listening on: " + aeIp + ":" + aePort);
});

var lamp_value = 0;
var presence_value = 0; // Variable to track presence sensor state

app.post("/" + aeId, function (req, res) {
    var req_body = req.body["m2m:sgn"].nev.rep["m2m:cin"];
    if (req_body != undefined) {
        console.log("\n[NOTIFICATION]");
        console.log(req_body);
        var content = req_body.con;
        console.log("Received luminosity: " + content);

        // Handle luminosity control
        if (content > threshold && lamp_value == 1) {
            console.log("High luminosity => Switch lamp to 0");
            for (var i = 0; i < arr_container.length; i++) {
                createContenInstance(i, "0");
            }
            lamp_value = 0;
        } else if (content < threshold && lamp_value == 0) {
            console.log("Low luminosity => Switch lamp to 1");
            for (var i = 0; i < arr_container.length; i++) {
                createContenInstance(i, "1");
            }
            lamp_value = 1;
        } else {
            console.log("Nothing to do");
        }

        // Handle presence sensor notifications
        if (req_body.rn === "presence") {
            presence_value = content; // Update presence value
            if (presence_value == 1) {
                console.log("Presence detected => Turn on buzzer");
                createContenInstance(arr_container.length - 1, "1"); // Turn on buzzer
            } else {
                console.log("No presence detected => Turn off buzzer");
                createContenInstance(arr_container.length - 1, "0"); // Turn off buzzer
            }
        }

        res.sendStatus(200);
    }
});

createAE();

function createAE() {
    console.log("\n[REQUEST]");
    var method = "POST";
    var url = cseUrl + "/Mobius";
    var resourceType = 2;
    var requestId = Math.floor(Math.random() * 10000);
    var representation = {
        "m2m:ae": {
            "rn": aeName,
            "api": "app.company.com",
            "rr": "true",
            "poa": ["http://" + aeIp + ":" + aePort]
        }
    };

    console.log(method + " " + url);
    console.log(representation);

    var options = {
        url: url,
        method: method,
        headers: {
            "Accept": "application/json",
            "X-M2M-Origin": aeId,
            "X-M2M-RI": requestId,
            "Content-Type": "application/json;ty=" + resourceType
        },
        json: representation
    };

    request(options, function (error, response, body) {
        console.log("[RESPONSE]");
        if (error) {
            console.log(error);
        } else {
            console.log(response.statusCode);
            console.log(body);
            if (response.statusCode == 409) {
                resetAE();
            } else {
                createSubscription();
            }
        }
    })}