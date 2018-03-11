function Comms(vue) {
    this.connect = function() {
        this.socket.on('connect', function() {
            console.log('connected');
        });
        this.socket.on('disconnect', function() {
            console.log('disconnected');
        });
        this.socket.on('orientation', function(p) {
            console.log(p);
            if (p == null) return;
            var orient = "x: " + p.x + ", y: " + p.y + ", z:" + p.z;
            this.orient.x = p.x;
            this.orient.y = p.y;
            this.orient.z = p.z;
        }.bind(this));
        this.socket.on('location', function(d) {
            if (d == null || !(d.lat && d.lon)) {
                console.log(new Date(), "invalid:", d);
                return;
            } else {
                var p = [d.lat, d.lon]; //[d.lat / 1000000, d.lon / 1000000];
                console.log(new Date(), p)
            }

            // filter out points that are too close to each other,
            // as they create only noise on the map
            if (this.track.points.length > 0 &&
                this.map.distance(p, this.track.points[this.track.points.length-1]) < this.track.precision) {
                return;
            }

            // add the current location to history before changing it
            if (this.location && (this.location.lat != 0 && this.location.lon != 0)) this.track.points.push(this.location);
            this.location = p;

            // add a marker on the previous place the player was seen, and
            // if possible a line from there to the new location
            if (this.track.points.length > 0) {
                var lastTrackPoint = this.track.points[this.track.points.length - 1];
            }

            this.map.panTo(p); // keep following at the current zoom level
            if (this.marker) this.marker.setLatLng(this.location);
            else {
                this.marker = L.marker(this.location).addTo(this.map);
                this.map.setZoom(21);
                this.map.panTo(p);
            }

            if (this.track.line) this.track.line.setLatLngs(this.track.points.concat([this.location]));
            else this.track.line = L.polyline(this.track.points.concat([this.location]), this.track.lineOptions).addTo(this.map);
        }.bind(this));
    }.bind(vue);

    this.playAudio = function() {
        console.log("triggering playback");
        this.socket.emit('play');
    }.bind(vue);
}
