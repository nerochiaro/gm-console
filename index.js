var express = require('express'),
    app = express(),
    mqtt = require('mqtt'),
    WebSocket = require('ws'),
    io = require('socket.io'),
    request = require('request');

// ------- Web server

var port = process.env.PORT || 8080;

app.use(express.static(__dirname + '/static'));
var webserver = app.listen(port, function() {
    console.log('Our app is running on http://localhost:' + port);
});

var status = {
    subscribed: false,
    connected: false,
    lastLocation: null,
    lastOnline: false
}

// -------- Socket.IO

var ioserver = io(webserver);
ioserver.on('connect', function(socket) {
    console.log("websocket: connected");
    socket.emit('location', status.lastLocation);
    socket.emit('online', status.lastOnline);
})

// -------- MQTT

var options = {
    host: "io.adafruit.com",
    port: 8883, // 1883 for the no-TSL version
    username: "nerochiaro",
    password: "13146cce703f4c1a83b7d2467bcbc9fd"
}
var locationTopic = options.username + "/feeds/location";
var onlineTopic = options.username + "/feeds/online";

function parseLocation(message) {
    var location = { fix: false, lat: 0.0, lon: 0.0, ele: 0.0 }
    var parts = message.split(",");
    if (parts.length == 4) {
        location.fix = (parseInt(parts[0]) == 1);
        location.lat = (parseFloat(parts[1]));
        location.lon = (parseFloat(parts[2]));
        location.ele = (parseFloat(parts[3]));
    }
    return location;
}

function getLastValue(topic, callback) {
    request({url: 'https://io.adafruit.com/api/v2/' + onlineTopic, headers: {
        'X-AIO-Key': options.password
    }}, function (error, response, body) {
          if (!error && response && response.statusCode == 200) {
              var data = JSON.parse(body);
              callback(data.last_value);
          } else {
              console.log("Failed to fetch last value for " + topic);
              console.log('Error:', error);
              console.log('StatusCode:', response && response.statusCode);
              callback(null);
        }
    });
};

var debug = {
    active: true,
    drift: { lat: 0.0, lon: 0.0 },
    driftDelta: 0.0005
}

var mqttClient = null;
getLastValue(locationTopic, function(v) {
    status.lastLocation = parseLocation(v);
    ioserver.emit("location", status.lastLocation);
    getLastValue(onlineTopic, function(v) {
        status.lastOnline = (v == 1);
        ioserver.emit("online", status.lastOnline);
        mqttClient = mqtt.connect("mqtt://" + options.host, {username: options.username, password: options.password})
        connectMQTTEvents();
    });
});

function connectMQTTEvents() {
    mqttClient.on("connect", function () {
        console.log("connected");
        connected = true;
        mqttClient.subscribe([locationTopic, onlineTopic], function(err, granted) {
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
        } else if (topic == onlineTopic) {
            status.lastLocation = message.toString();
            ioserver.emit("online", status.lastLocation);
        }
    })
}
