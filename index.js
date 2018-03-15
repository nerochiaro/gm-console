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

var Player = function(name) {
    this.name = name;
    this.adjust = { x: 0, y: 0, z: 0, w: 0 },
    // user array of objects to make binding things easier in Vue on the client side
    this.interrupts = [{done: false}, {done: false}]
}
var players = {};

function getPlayer(name) {
    var key = name.toLowerCase();
    if (!players[key]) players[key] = new Player(name);
    return players[key];
}

ioserver.on('connect', function(socket) {
    console.log("websocket: connected.");

    for (key in players) {
        var p = players[key];
        socket.emit('adjust', { player: p.name, adjust: p.adjust });
        socket.emit('mic', { player: p.name, done: p.interrupts });
    }

    socket.on('register_board', function() {
        socket.join('boards');
    })
    socket.on('play', function(d) {
        ioserver.to('boards').emit('play', d)
        console.log("Playback requested for player: " + d.player + ", file " + d.audio_file)
        deliverPlaybackNotification = true;
    })
    socket.on('mic', function(d) {
        var p = getPlayer(d.player);
        if (!p) return;
        if (d.interrupt) {
            if (p.interrupts[0].done == false) p.interrupts[0].done = true;
            else if (p.interrupts[1].done == false) p.interrupts[1].done = true;
        }
        d.done = p.interrupts;
        ioserver.emit('mic', d)
    })
    socket.on('orient', function(d) { ioserver.emit('orientation', d) })
    socket.on('adjust', function(d) {
        var p = getPlayer(d.player);
        if (!p) return;

        p.adjust = d.adjust;
        ioserver.emit('adjust', {player: d.player, adjust: p.adjust})
    })
    socket.on('clear_interrupts', function(d) {
        var p = getPlayer(d.player);
        if (!p) return;

        p.interrupts[0].done = false;
        p.interrupts[1].done = false;
        ioserver.emit('mic', {player: d.player, done: p.interrupts});
    })
})
