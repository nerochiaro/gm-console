var express = require('express'),
    app = express(),
    mqtt = require('mqtt'),
    WebSocket = require('ws'),
    io = require('socket.io'),
    request = require('request');

var status = {
    subscribed: false,
    connected: false,
    lastLocation: {lat: 0, lon: 0},
    lastOrientation: { x:0, y:0, z:0 }
}
var deliverPlaybackNotification = false;

// ------- Web server

var port = process.env.PORT || 8080;

app.use(express.static(__dirname + '/static'));
var webserver = app.listen(port, function() {
    console.log('Our app is running on http://localhost:' + port);
});
var ioserver = io(webserver);

var routes = express.Router();
routes.get('/set/:values', function(req, res) {
    res.status(200).send(deliverPlaybackNotification ? 'PLAY' : 'DONE');
    deliverPlaybackNotification = false;
    var v = req.params['values'];
    if (v) {
        var p = v.split(","); // x, y, z, lat, lon
        status.lastOrientation = { x: parseFloat(p[0]) || 0, y: parseFloat(p[1]) || 0, z: parseFloat(p[2]) || 0 };
        status.lastLocation = { lat: parseFloat(p[3]) || 0, lon: parseFloat(p[4]) || 0};
        ioserver.emit('orientation', status.lastOrientation);
        ioserver.emit('location', status.lastLocation);
    }
});
app.use('/', routes);

var options = {
    host: "io.adafruit.com",
    port: 8883, // 1883 for the no-TSL version
    username: "nerochiaro",
    password: "13146cce703f4c1a83b7d2467bcbc9fd"
}
var locationTopic = options.username + "/feeds/lc";
var orientationTopic = options.username + "/feeds/or";
var soundTopic = options.username + "/feeds/sn";

function parseLocation(message) {
    var location = { lat: 0.0, lon: 0.0, ele: 0.0 }
    if (message) {
        var parts = message.split(",");
        if (parts.length == 2) {
            location.lat = (parseInt(parts[0]) / 1000000);
            location.lon = (parseInt(parts[1]) / 1000000);
        }
    }
    return location;
}

function parseOrientation(message) {
    var orientation = { x: 0.0, y: 0.0, z: 0.0 };
    if (message) {
        var parts = message.split(",");
        if (parts.length == 3) {
            orientation.x = (parseInt(parts[0]) / 10000);
            orientation.y = (parseInt(parts[1]) / 10000);
            orientation.z = (parseInt(parts[2]) / 10000);
        }
    }
    return orientation;
}

var debug = {
    active: false,
    drift: { lat: 0.0, lon: 0.0 },
    driftDelta: 0.0005
}

function connectMQTTEvents() {
    mqttClient.on("connect", function () {
        console.log("connected");
        connected = true;
        mqttClient.subscribe([locationTopic, orientationTopic], function(err, granted) {
            console.log("subscribe:", err, granted)
            if (!err) {
                granted.forEach(function(c) { ioserver.emit("subscribed", c.topic) });
                subscribed = true;
            }
        })
    })

    mqttClient.on('disconnect', function() {
        console.log("disconnected");
        connected = false;
        client.reconnect();
    })

    mqttClient.on('message', function (topic, message) {
        console.log(topic, message.toString())
        if (topic == locationTopic) {
            var loc = parseLocation(message.toString());
            if (debug.active) {
                if (Math.random() >= 0.5) debug.drift.lat += debug.driftDelta;
                if (Math.random() >= 0.5) debug.drift.lon += debug.driftDelta;
                loc.lat += debug.drift.lat;
                loc.lon += debug.drift.lon;
            }
            status.lastLocation = loc;
            ioserver.emit("location", loc);
        } else if (topic == orientationTopic) {
            var orient = parseOrientation(message.toString());
            status.lastOrientation = orient;
            ioserver.emit("orientation", orient);
        }
    })
}


var mqttClient = null;
mqttClient = mqtt.connect("mqtt://" + options.host, {username: options.username, password: options.password})

ioserver.on('connect', function(socket) {
    console.log("websocket: connected. status:", status.lastLocation, status.lastOrientation);
    socket.emit('location', status.lastLocation);
    socket.emit('orientation', status.lastOrientation);
    socket.on('play', function() {
        console.log("playback requested")
        mqttClient.publish(soundTopic, "1", { qos: 1 }, function() { console.log("playback delivered") });
        deliverPlaybackNotification = true;
    })
})

//connectMQTTEvents();
