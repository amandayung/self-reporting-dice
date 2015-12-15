//Photon info
var device = "PUT PHOTON DEVICE CODE HERE";
var token = "PUT TOKEN HERE";

//ordered by side (1,2...20 ---> 0 is 1)
//ranges estimated from ~50 data points for each side
var minPitch = [-33, 28, 7, -44, -20, -25, 7, 44, -60, 70, -82, 51, -55, -15, 14, 8, 32, -15, -37, 25];
var maxPitch = [-23, 40, 17, -34, -13, -15, 20, 55, -48, 83, -71, 58, -42, -6, 30, 23, 44, -4, -23, 34];
var minRoll = [-157, -35, 139, -4, -81, 70, -149, 67, 101, -180, -37, -75, -117, 30, -110, 95, -180, -41, 152, 19];
var maxRoll = [-152, -17, 149, 4, -74, 85, -140, 79, 119, 180, 22, -62, -98, 43, -95, 106, 180, -30, 165, 30];
var minHeading = [176, 253, 0, 158, 216, 89, 215, 0, 126, 0, 150, 250, 185, 85, 240, 4, 0, 200, 126, 0];
var maxHeading = [228, 350, 150, 200, 275, 135, 285, 360, 170, 360, 200, 320, 230, 165, 290, 100, 360, 250, 180, 360];

//var minGyro = [-1, 3, -3];
//var maxGyro = [1, 5, -1];

//keeps track of what side was rolled
var sideRolled = -1;

//max length of data saved per measure (pitch, roll, heading, gyroscope values)
var maxLength = 3;

//for storing the last x number of values from the d20 (determned by maxLength)
var pitch = [];
var roll = [];
var heading = [];
var gyrox = [];
var gyroy = [];
var gyroz = [];


//acceptable threshold to determine if the die is stable/stationary for orientation, based on gyroscope std values
var stableThreshold = 0.5;

//one of the 3 gyroscope values has to have a std greater than this in order to consider the die rolling
var motionThreshold = 10;

//connect to node server
var socket = io();

console.log('start');

//get any data being sent from the cloud
getCloudData();

//get commands from index
$("#reset-button").click(resetD20);
$("#send-button").click(gotoSide);


/***Orientation Sensor Die interaction***/

//using Spark.publish to pass data, tutorial from:
//https://community.particle.io/t/tutorial-getting-started-with-spark-publish/3422
function getCloudData() {
	var eventSource = new EventSource(
		"https://api.spark.io/v1/devices/" + device + "/events/?access_token=" + token);

	//readings is the name of event in the firmware
	eventSource.addEventListener("readings", function(e) {
		var cloudData = JSON.parse(e.data);

		//the data needs to be parsed twice (SparkJSON sends it as a string variable, rather than just JSON)
		getData(cloudData.data);
	})

}

//parse the measurement readings from the photon sensors
//and add to array
function getData(data) {
	var orientation = JSON.parse(data);
	//console.log(orientation.pitch + "," + orientation.roll + "," + orientation.heading);
	//console.log("gx: " + orientation.gyrox + ", gy: " + orientation.gyroy + "gz: " + orientation.gyroz);

	pitch.push(orientation.pitch);
	roll.push(orientation.roll);
	heading.push(orientation.heading);

	gyrox.push(orientation.gyrox);
	gyroy.push(orientation.gyroy);
	gyroz.push(orientation.gyroz);

	if (pitch.length > maxLength) {
		pitch.shift();
		roll.shift();
		heading.shift();

		gyrox.shift();
		gyroy.shift();
		gyroz.shift();
	}

	//now determine side based on current data
	determineSide();

}

//check orientation values collected so far and see if the d20
//has "landed" on a side
function determineSide() {
	//determine standard deviation for pitch, roll, and heading
	var stdPitch = standardDeviation(pitch);
	var stdRoll = standardDeviation(roll);
	var stdHeading = standardDeviation(heading);

	var stdgx = standardDeviation(gyrox);
	var stdgy = standardDeviation(gyroy);
	var stdgz = standardDeviation(gyroz);

	//console.log("gyro std: " + stdgx + "," + stdgy + "," + stdgz);

	//if there isn't much noise in the gyroscope values, then it should have settled on a side
	if (stdgx < stableThreshold && stdgy < stableThreshold && stdgz < stableThreshold && sideRolled == 0) {

		//get average for all measures
		var curPitch = average(pitch);
		var curRoll = average(roll);
		var curHeading = average(heading);

		console.log(curPitch + "," + curRoll + "," + curHeading);

		//then match these values with the side
		for (var i=0; i < 20; i++) {
			if (curPitch >= minPitch[i] && curPitch <= maxPitch[i] && 
				curRoll >= minRoll[i] && curRoll <= maxRoll[i] &&
				curHeading >= minHeading[i] && curHeading <= maxHeading[i]) {
				var curSide = i+1;

				sideRolled = curSide;
				$("#side").text(sideRolled);
				console.log(sideRolled);
				rollTo(curSide);
			}
		}
		//if nothing matches, then just collect more values from the Photon
	}
	//if the die is moving around a lot, then probably being rolled now
	else if ((stdgx > motionThreshold || stdgy > motionThreshold || stdgz > motionThreshold) && sideRolled != 0) {
		sideRolled = 0;
		rollTo(21); //21 is the code for spinning the partner die until a number is determined
	}
}


/*Self-Rolling Die interaction*/
function resetD20() {
	//0 will ensure it goes directly to its resting state
	socket.emit('to serial', "0");
}

//send rolled side to the self-rolling die
function rollTo(side) {
	console.log("sending side: " + side);
	socket.emit('to serial', side);
}

//for manual browser input of a die side
function gotoSide() {
	var side = parseInt($("#d20-command").val());
	if (side >= 1 && side <= 20) {
		$("#side").text(side);
		console.log("sending side: " + side);
		socket.emit('to serial', side);
	}
}

/*Helper Functions*/

//calculate std dev of data in order to determine if there is a lot of noise or not
//i.e., if the die is currently rolling, or if it's stationary
//js standardDevation function found here:
//http://derickbailey.com/2014/09/21/calculating-standard-deviation-with-array-map-and-array-reduce-in-javascript/
function standardDeviation(values){
  var avg = average(values);
  
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });
  
  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

//average function from same source as above
function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}