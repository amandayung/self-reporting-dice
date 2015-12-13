// Requires the Adafruit_Motorshield v2 library 
//   https://github.com/adafruit/Adafruit_Motor_Shield_V2_Library
// And AccelStepper with AFMotor support 
//   https://github.com/adafruit/AccelStepper

// Code is based the Adafruit Motorshield tutorial included with the
// Adafruit libraries above

#include <AccelStepper.h>
#include <Wire.h>
#include <Adafruit_MotorShield.h>
#include "utility/Adafruit_PWMServoDriver.h"


// SerialEvent tutorial for getting data from serial port:
// http://www.arduino.cc/en/Tutorial/SerialEvent
//adding variables for storing string info
String inputString = "";         // a string to hold incoming data
boolean stringComplete = false;  // whether the string is complete

//add motorshield
Adafruit_MotorShield AFMS = Adafruit_MotorShield(); 

//add the two steppers (one with 32 steps and one with 200)
Adafruit_StepperMotor *myStepper1 = AFMS.getStepper(32, 1);
Adafruit_StepperMotor *myStepper2 = AFMS.getStepper(200, 2);

// you can change these to DOUBLE or INTERLEAVE or MICROSTEP!
// wrappers for the first motor!
void forwardstep1() {  
  myStepper1->onestep(FORWARD, SINGLE);
}
void backwardstep1() {  
  myStepper1->onestep(BACKWARD, SINGLE);
}
// wrappers for the second motor!
void forwardstep2() {  
  myStepper2->onestep(FORWARD, INTERLEAVE);
}
void backwardstep2() {  
  myStepper2->onestep(BACKWARD, INTERLEAVE);
}

// Now we'll wrap the 2 steppers in an AccelStepper object
AccelStepper stepper1(forwardstep1, backwardstep1);
AccelStepper stepper2(forwardstep2, backwardstep2);

//flag for whether to continually roll D20 or not
boolean isRolling = false;
long rollDuration = 500; //about 1 rotation


void setup() {
  //open connection to serial port
  Serial.begin(9600);

  // reserve 200 bytes for the inputString:
  inputString.reserve(200);

  AFMS.begin(); // Start the motor shield
   
  stepper1.setMaxSpeed(513.0);
  stepper1.setAcceleration(200.0);
  stepper1.moveTo(0);
    
  stepper2.setMaxSpeed(200.0);
  stepper2.setAcceleration(100.0);
  stepper2.moveTo(-10); //this is needed so that the motor actually holds itself up at the start
}

void loop() {
  serialEvent(); //get the serial message

  //now check to see what number was sent by the server
  if (stringComplete) {

    //if 0, then move die to starting position
    if (inputString.toInt() == 0) {
      resetD20();
      isRolling = false;
    }

    //if 21, then the die is currently "rolling"
    else if (inputString.toInt() == 21) {
      isRolling = true;
    }

    //otherwise, the die has settled on a side
    else {
      setD20();
      isRolling = false;
    }

    //clear the string
    inputString = "";
    stringComplete = false;
  }

  //check if the wifi die is currently still rolling;
  //if it is, then make sure the self-rolling die still moving
  if (isRolling) {
    rollD20();
  }

  //keep motors moving
  stepper1.run();
  stepper2.run();
}

void setD20() {
  //get side value from input string
  int side = inputString.toInt();
  long stepper1Location = 0;
  long stepper2Location = 0;

  //now move to the correct side
  switch(side) {
    case 1:
      stepper1Location = 255;
      stepper2Location = -7;
      break;
    case 2:
      stepper1Location = 51;
      stepper2Location = -7;
      break;
    case 3:
      stepper1Location = -204;
      stepper2Location = 51;
      break; 
    case 4:
      stepper1Location = -51;
      stepper2Location = -51;
      break;
    case 5:
      stepper1Location = 153;
      stepper2Location = -51;
      break;
    case 6:
      stepper1Location = -102;
      stepper2Location = 4;
      break;
    case 7:
      stepper1Location = 204;
      stepper2Location = 4;
      break;
    case 8:
      stepper1Location = 0;
      stepper2Location = 51;
      break;
    case 9:
      stepper1Location = -153;
      stepper2Location = -7;
      break;
    case 10:
      stepper1Location = 102;
      stepper2Location = 51;
      break;
    case 11:
      stepper1Location = -153;
      stepper2Location = -51;
      break;
    case 12:
      stepper1Location = 102;
      stepper2Location = 4;
      break;
    case 13:
      stepper1Location = 255;
      stepper2Location = -51;
      break;
    case 14:
      stepper1Location = -51;
      stepper2Location = -7;
      break;
    case 15:
      stepper1Location = 153;
      stepper2Location = -7;
      break;
    case 16:
      stepper1Location = -102;
      stepper2Location = 51;
      break;
    case 17:
      stepper1Location = 204;
      stepper2Location = 51;
      break;
    case 18:
      stepper1Location = 51;
      stepper2Location = -51;
      break;
    case 19:
      stepper1Location = -204;
      stepper2Location = 4;
      break;
    case 20:
      stepper1Location = 0;
      stepper2Location = 4;
      break;
    default:
      //go to resting state
      stepper1Location = 0;
      stepper2Location = 0;
      
    break;
  }

  stepper1.moveTo(stepper1Location);
  stepper2.moveTo(stepper2Location);
}

//set die to its starting position
void resetD20() {
  stepper1.moveTo(0);
  stepper2.moveTo(0);
}

//continually roll D20 until a side is settled on by the wifi die
void rollD20() {
  if (stepper1.distanceToGo() == 0) {
    rollDuration = -rollDuration;
    stepper1.moveTo(rollDuration);
  }
  stepper2.moveTo(0);
}

/*
  SerialEvent occurs whenever a new data comes in the
 hardware serial RX.  This routine is run between each
 time loop() runs, so using delay inside loop can delay
 response.  Multiple bytes of data may be available.
 */
void serialEvent() {
  while (Serial.available()) {
    // get the new byte:
    char inChar = (char)Serial.read();
    // add it to the inputString:
    inputString += inChar;
    // if the incoming character is a newline, set a flag
    // so the main loop can do something about it:
    if (inChar == '\n') {
      stringComplete = true;
    }
  }
}


