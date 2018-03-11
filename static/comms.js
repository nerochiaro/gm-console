var Player = function(name) {
    this.name = name;
    this.orient = {
        x: 0, y: 0, z: 0
    };
    this.zoom = 1;
    this.location = {
        lat: 0.0, lon: 0.0
    };
    this.marker = null;
    this.track = {
        points: [],
        line: null,
        precision: 2
    }

    // Try to assign the player a color based on the player's name.
    // If that fails, assign a random color.
    try { this.color = chroma(name.toLowerCase()) }
    catch (e) { this.color = chroma.random() }
}

function Comms(vue) {
    var self = this; // keep around instance of self to refer to from inside member functions.

    this.getPlayer = function(name) {
        var key = name.toLowerCase();
        // if this player has not submitted anything yet, add a new empty entry
        if (this.players.hasOwnProperty(key)) {
            return this.players[key];
        } else {
            var p = new Player(name);
            Vue.set(this.players, key, p);
            return p;
        }
    }.bind(vue);

    this.connect = function() {
        this.socket.on('connect', function() {
            console.log('connected');
        });
        this.socket.on('disconnect', function() {
            console.log('disconnected');
        });
        this.socket.on('orientation', function(d) {
            if (d == null) return;
            var p = self.getPlayer(d.player);
            p.orient.x = d.x;
            p.orient.y = d.y;
            p.orient.z = d.z;
        }.bind(this));
        this.socket.on('location', function(d) {
            if (d == null || !d.player || !(d.lat && d.lon)) {
                console.log(new Date(), "invalid:", d);
                return;
            } else {
                var loc = [d.lat, d.lon];
            }

            var needPan = Object.keys(this.players).length == 0;
            var p = self.getPlayer(d.player);

            // filter out points that are too close to each other,
            // as they create only noise on the map
            if (p.track.points.length > 0 &&
                this.map.distance(loc, p.track.points[p.track.points.length - 1]) < p.track.precision) {
                return;
            }

            // add the current location to history before changing it
            if (p.location.lat != 0 && p.location.lon != 0) {
                p.track.points.push([p.location.lat, p.location.lon]);
            }
            p.location.lat = loc[0];
            p.location.lon = loc[1];

            // draw a track from the previous point to the current one
            p.track.points.push(loc);
            if (p.track.line) p.track.line.setLatLngs(p.track.points);
            else p.track.line = L.polyline(p.track.points, {
                weight: 6, color: p.color.name()
            }).addTo(this.map);

            // draw a marker at the current point
            if (p.marker) p.marker.setLatLng(loc);
            else {
                p.marker = L.circleMarker(loc, {
                    color: p.color.name(),
                    fill: true, fillOpacity: 1.0,
                    fillColor: p.color.darken().name()
                }).addTo(this.map);
                this.map.setZoom(21);
                this.map.panTo(loc);
            }

            if (needPan) this.map.panTo(loc); // keep following at the current zoom level
        }.bind(this));
    }.bind(vue);

    this.playAudio = function(player) {
        console.log("Triggering playback for:", player.name);
        this.socket.emit('play', { player: player.name });
    }.bind(vue);
}
