var twilio = require('twilio'),
  cfenv = require('cfenv')
  express = require('express'),
  xmlparser = require('express-xml-bodyparser'),
  bodyParser = require('body-parser'),
  speech = require('./speech.js'),
  doctor = require('./doctor.js');

var service = cfenv.getAppEnv().getService("twilio")

var twilio_account_ssid = service.credentials.accountSID,
  twilio_auth_token = service.credentials.authToken

var client = twilio(twilio_account_ssid, twilio_auth_token);

var app = express();
app.use(bodyParser.urlencoded())
app.use(xmlparser());

// Used to store a map from call_ssid -> answers
var answers = {};

var enqueue_question = function (recording) {
  var audio_location = recording.RecordingUrl,
    call_ssid = recording.CallSid;

  speech.text(audio_location, function (question) { 
      console.log(call_ssid + " question: " + question);
      doctor.ask(question, function (answer){
        console.log(call_ssid + " answer: " + answer);
        answers[call_ssid] = answer;
        
        var forward_to = cfenv.getAppEnv().url + "/calls/answer"
        client.calls(call_ssid).update({
          //BUG: HTTPS locations are getting a 403 sent back...    
          url: forward_to.replace("https", "http")
        });    
      })  
  });    
}

var app_url = function () {

}

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function(req, res) {
  res.send('hello world')
})

app.post('/calls/', twilio.webhook(twilio_auth_token), function(req, res) {
  console.log("New HTTP request for 'calls'");
  console.log(req.body);
  var twiml = new twilio.TwimlResponse();
  twiml.say('Hello this is Doctor Watson, how can I help you? Press any key after you have finished speaking')
    .record({timeout: 60, action: "/calls/recording"});
  
  res.send(twiml);  
})

app.post('/calls/holding', twilio.webhook(twilio_auth_token), function(req, res) {
  console.log("New HTTP request for 'calls/holding'");
  var twiml = new twilio.TwimlResponse();
  twiml.pause({length: 5})
    .say("I'm still thinking")    
    .redirect("/calls/holding");
  
  res.send(twiml);  
});


app.post('/calls/recording', twilio.webhook(twilio_auth_token), function(req, res) {
  console.log("New HTTP request for 'calls/recording'");

  var twiml = new twilio.TwimlResponse();

  console.log(req.body);

  enqueue_question(req.body);

  twiml.say("Let me think about that.").redirect("/calls/holding");
  res.send(twiml);
})

app.post('/calls/answer', twilio.webhook(twilio_auth_token), function(req, res) {
  console.log("New HTTP request for 'calls/answer'");

  var twiml = new twilio.TwimlResponse();

  console.log(req.body);

  twiml.say(answers[req.body.CallSid])
    .say("Do you have another question?")
    .record({timeout: 60, action: "/calls/recording"});

  res.send(twiml);
})

var server = app.listen(3000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)

})