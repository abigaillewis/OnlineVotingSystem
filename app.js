// Create pointer to express, path, body-parser and fs modules
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var fs = require('fs');

// Create an instance of express
var app = express();

// Tells app to use the middleware body parser
app.use(bodyParser());

// Sets public path
var publicPath = path.resolve(__dirname, '');
app.use(express.static(publicPath));

// Creates pointer to http and socket.io modules
var server = require('http').createServer(app);
var io = require('socket.io')(server);

// Listen on port 8080 for connections
server.listen(8080);

// Global variable to store current number of votes for each option
var answers = [0,0,0];

// Global variable to store percentage of votes
var percentages = [0,0,0];

// Listens for a connection to socket.io
io.on('connection', function (socket) {
    
    // Listens for a message to be sent on socket.io
    socket.on('message', function (msg) {
      // Message can either be: 1, 2, 3 or "results"
      // If message is 1, 2 or 3 incrememnt corresponding option in answers array
      // If message is results do nothing as a new vote has not happened so nothing needs to be updated
      if (msg === 1) {
          answers[0]++;
      }
      else if (msg === 2) {
          answers[1]++;
      }
      else if (msg === 3) {
          answers[2]++;
      }
      
      // Calculate percentage each option has
      var total = answers[0] + answers[1] + answers[2];
      percentages = [(answers[0]/total*100),(answers[1]/total*100),(answers[2]/total*100)];

      // Send these percentages in an array to the client
      // Emit sends message to all clients including client that sent message
      io.emit('message', percentages);
    });
    
    // When a message is recieved requesting results, send message containing percentages of votes
    socket.on('results',function(){
      socket.emit("message",percentages);
    })
});
   
// Initially load login page
app.get('/', function(req, res){       
  res.sendFile('login.html',{root: publicPath});
});

// Read questions from json file and store in javascript object
var json;
fs.readFile( __dirname + "/" + "questions.json", 'utf8', function (err, data) {
  json = JSON.parse(data);
});

// Executed when user submits the form on the login page
app.post('/', function(req, res){
  // Dictionary to store user login details
  var dictionary = {};
  dictionary["user1@email.com"] = "password1";
  dictionary["user2@email.com"] = "password2";

  // Gets user information from form
  var email = req.body.email;
  var password = req.body.password;
  var votingID = req.body.votingID;
  
  // Get current date (Adds one for month as January is 0)
  var today = new Date();
  var date = today.getDate();
  var month = today.getMonth()+1;
  var year = today.getFullYear();

  // Check to see if email address is in dictionary
  for (key in dictionary) {
    if (key === email) {
      // Checks password is correct for corresponding email address
      if (dictionary[key] === password) {
          // Find the date that the voting topic closes
          for (var i=1; i<=Object.keys(json).length; i++) {
            if (json[i]["id"] == votingID) {
              // If the voting topic hasn't closed redirect to the voting page (as required in specification)
              if ((year < json[i]["endYear"]) || (month < json[i]["endMonth"] && year == json[i]["endYear"]) || (date < json[i]["endDate"] && month == json[i]["endMonth"] && year == json[i]["endYear"])) {
                res.redirect("voting.html");
              }
              // If the voting topic has closed redirect to the results page (as required in specification)
              else {
                res.redirect("results.html");
              }
            }
          }
      }
    }
  }

  // If email address and password are incorrect redirect to login error page
  res.redirect("loginError.html");
});