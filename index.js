var mqtt = require('mqtt')

var options = {
    host: "io.adafruit.com",
    port: 8883, // 1883 for the no-TSL version
    username: "nerochiaro",
    password: "13146cce703f4c1a83b7d2467bcbc9fd"
}

var client  = mqtt.connect('mqtt://' + options.host, {username: options.username, password: options.password})
client.on('connect', function () {
    console.log("connected");
    client.subscribe('nerochiaro/f/location', function(err, granted) {
        console.log(err, granted);
    })
    //client.publish('presence', 'Hello mqtt')
})

client.on('message', function (topic, message) {
  console.log(topic, message.toString())
})
