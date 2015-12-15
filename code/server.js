//Modified version of server.js from:
//https://github.com/hcin720-fall15/IA2

//Run this file with "node server.js"
var express    = require('express');
var app        = express();
var http       = require('http').Server(app);
var io         = require('socket.io')(http);
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var portName = 'COM7'; //change this to be your serial port name

//get the local static files that are included in index.html
//tip from:
//http://stackoverflow.com/questions/24410340/nodejs-server-res-sendfile-returning-html-but-not-the-jscript-includes-scri
app.use(express.static(__dirname));

//When a request come into the server for / give the client the file index.html
//changed it to sendFile to stop it from complaining about deprecated function
app.get('/', function(req, res){res.sendFile('index.html', { root: __dirname });});

//Listen for incoming connections
http.listen(3000, function(){console.log("listening on port 3000");});

//Hook up the serial port
var serial = new SerialPort( portName,
 	{parser: serialport.parsers.readline('\n')});

//When the serial port is successfully opened...
serial.on('open', function()
{
	console.log("opened serial port");
});


//Here's what happens when a connection is made from the browser
io.sockets.on('connection',
	function(socket)
	{
		console.log("someone connected");

		//send serial message to the Arduino
		socket.on('to serial', function(data)
		{
			if(serial.isOpen())
			{
				serial.write(data + '\n');
				console.log("Send '" + data + "' to serial");
			}
			else
				console.log("Serial port not open");
		});
	}
);
