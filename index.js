var express = require('express'),
    app = express(),
    WebSocket = require('ws'),
    io = require('socket.io'),
    request = require('request');

// ------- Web server

var port = process.env.PORT || 8080;

app.use(express.static(__dirname + '/static'));
var webserver = app.listen(port, function() {
    console.log('Our app is running on http://localhost:' + port);
});
var ioserver = io(webserver);

var routes = express.Router();
routes.get('/set/:player/orient/:x,:y,:z', function(req, res) {
    res.status(200).send();
    var msg = { player: req.params.player,
                x: parseFloat(req.params.x) || 0,
                y: parseFloat(req.params.y) || 0,
                z: parseFloat(req.params.z) || 0 };
    ioserver.emit('orientation', msg);
});
routes.get('/set/:player/location/:lat,:lon', function(req, res) {
    res.status(200).send();
    var msg = { player: req.params.player,
                lat: parseFloat(req.params.lat) || 0,
                lon: parseFloat(req.params.lon) || 0 };
    ioserver.emit('location', msg);
});
routes.get('/set/:player/mic/:mic,:interrupt', function(req, res) {
    res.status(200).send();
    var msg = { player: req.params.player,
                mic: parseInt(req.params.mic) || 0,
                interrupt: req.params.interrupt == "true" };
    ioserver.emit('mic', msg);
});
app.use('/', routes);

ioserver.on('connect', function(socket) {
    console.log("websocket: connected.");
    socket.on('play', function(d) {
        console.log("Playback requested for player: " + d.player)
        deliverPlaybackNotification = true;
    })
})
