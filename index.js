var express = require('express'),
    app = express(),
    WebSocket = require('ws'),
    io = require('socket.io'),
    request = require('request'),
    gpxparser = require('gpx-parse');

var Player = function(name) {
    this.name = name;
    this.adjust = { x: 0, y: 0, z: 0, w: 0 };
    // user array of objects to make binding things easier in Vue on the client side
    this.interrupts = [{done: false}, {done: false}];
    this.track = null
}
var players = {};
function getPlayer(name) {
    var key = name.toLowerCase();
    return players[key];
}

// ------- Web server

var port = process.env.PORT || 8080;
app.use(express.static(__dirname + '/static'));
var webserver = app.listen(port, function() {
    console.log('Our app is running on http://localhost:' + port);
});
var ioserver = io(webserver);

var tracks = {};
['blue', 'yellow'].forEach(function(key) {
    gpxparser.parseGpxFromFile('tracks/' + key + '.gpx', function(err, track) {
        tracks[key] = track.tracks[0].segments[0];
    });
});

function emitPlayers(list, target) {
    // if no target is specified, broadcast to the entire clients group
    if (!(target)) target = ioserver.to('clients');

    list.forEach(function(p) {
        target.emit('adjust', { player: p.name, adjust: p.adjust });
        target.emit('mic', { player: p.name, done: p.interrupts });
        if (p.track) target.emit('history', {
            player: p.name, history: p.track.map(function (point) {
                return { lat: point.lat, lon: point.lon }
            })
        });
    })
}

ioserver.on('connect', function(socket) {
    console.log("websocket: connected.");

    socket.on('register_board', function(d) {
        if (!d.player) {
            console.log("Board registration failed, missing player name");
            return;
        }
        socket.join('boards');
        console.log("registering as board:", d.player)

        socket.on('disconnect', function() {
            console.log("board leaves:", d.player)
            ioserver.to('clients').emit('leaving', { player: d.player });
        })

        // if this player had previously connected, keep its adjust and interrupts settings
        var key = d.player.toLowerCase();
        if (players[key] === undefined) players[key] = new Player(d.player);

        // if there is a pre-recorded track for this player, assign it
        if (tracks[key]) players[key].track = tracks[key];
        emitPlayers([players[key]]); // emit to all clients all available data for the player that just joined
    });

    socket.on('register_client', function() {
        socket.join('clients');
        // emit all available data about all players currently in the system, only to this client
        emitPlayers(Object.keys(players).map(function(key) { return players[key] }), socket);
    });

    socket.on('play', function(d) {
        console.log("Playback requested for player: " + d.player);
        ioserver.to('boards').emit('play', d)
    })

    socket.on('mic', function(d) {
        var p = getPlayer(d.player);
        if (!p) return;
        if (d.interrupt) {
            if (p.interrupts[0].done == false) p.interrupts[0].done = true;
            else if (p.interrupts[1].done == false) p.interrupts[1].done = true;
        }
        d.done = p.interrupts;
        ioserver.to('clients').emit('mic', d)
    })
    socket.on('orient', function(d) {
        ioserver.to('clients').emit('orientation', d)
    })
    socket.on('calibration', function(d) {
        ioserver.to('clients').emit('calibration', d)
    })
    socket.on('adjust', function(d) {
        var p = getPlayer(d.player);
        if (!p) return;

        p.adjust = d.adjust;
        ioserver.to('clients').emit('adjust', {player: d.player, adjust: p.adjust})
    })
    socket.on('clear_interrupts', function(d) {
        var p = getPlayer(d.player);
        if (!p) return;

        p.interrupts[0].done = false;
        p.interrupts[1].done = false;
        ioserver.to('clients').emit('mic', {player: d.player, done: p.interrupts});
    })
})
