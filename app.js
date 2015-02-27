var twilio = require('twilio'),
  cfenv = require('cfenv'),
  express = require('express'),
  xmlparser = require('express-xml-bodyparser'),
  bodyParser = require('body-parser'),
  serveStatic = require('serve-static'),
  log = require('loglevel'),
  speech = require('./lib/speech.js'),
  doctor = require('./lib/doctor.js');

log.setLevel("info");

var service = cfenv.getAppEnv().getService("twilio")

var twilio_account_ssid = service.credentials.accountSID,
  twilio_auth_token = service.credentials.authToken

var client = twilio(twilio_account_ssid, twilio_auth_token);
var number = "Unavailable";

// Access look up the first phone number bound to the account
client.incomingPhoneNumbers.list(function (err, response) {
  if (err) {
    log.error(err);  
    return;
  }

  number = response.incoming_phone_numbers[0].phone_number;
});

// Used to store a map from call_ssid -> answers
var answers = {};

// Callback soup stitching together API services used to 
// convert between an audio recording -> text -> watson answer.
var enqueue_question = function (recording) {
  var audio_location = recording.RecordingUrl,
    call_ssid = recording.CallSid;

  speech.text(audio_location, function (question) { 
      log.info(call_ssid + " QUESTION: " + question);
      doctor.ask(question, function (answer){
        log.info(call_ssid + " ANSWER: " + answer);
        answers[call_ssid] = answer;
        
        var forward_to = cfenv.getAppEnv().url + "/calls/answer"
        client.calls(call_ssid).update({
          //BUG: HTTPS locations are getting a 403 sent back...    
          url: forward_to.replace("https", "http")
        });    
      })  
  });    
}

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(xmlparser());

// Twilio callback handling. Set up routes for different parts of the phone
// call.
app.post('/calls/', twilio.webhook(twilio_auth_token), function(req, res) {
  log.info(req.body.CallSid + "-> calls/");
  log.debug(req.body);

  var twiml = new twilio.TwimlResponse();
  twiml.say('Hello this is Doctor Watson, how can I help you? Press any key after you have finished speaking')
    .record({timeout: 60, action: "/calls/recording"});
  
  res.send(twiml);  
})

app.post('/calls/holding', twilio.webhook(twilio_auth_token), function(req, res) {
  log.info(req.body.CallSid + "-> calls/holding");
  log.debug(req.body);

  var twiml = new twilio.TwimlResponse();
  twiml.pause({length: 5})
    .say("I'm still thinking")    
    .redirect("/calls/holding");
  
  res.send(twiml);  
});


app.post('/calls/recording', twilio.webhook(twilio_auth_token), function(req, res) {
  log.info(req.body.CallSid + "-> calls/recording");
  log.debug(req.body);

  var twiml = new twilio.TwimlResponse();

  enqueue_question(req.body);

  twiml.say("Let me think about that.").redirect("/calls/holding");
  res.send(twiml);
})

app.post('/calls/answer', twilio.webhook(twilio_auth_token), function(req, res) {
  log.info(req.body.CallSid + "-> calls/answer");
  log.debug(req.body);

  var twiml = new twilio.TwimlResponse();

  twiml.say(answers[req.body.CallSid])
    .say("Do you have another question?")
    .record({timeout: 60, action: "/calls/recording"});

  res.send(twiml);
})

// Render the index.html page with embedded twilio number
var plates = require('express-plates').init(app);

app.get('/', function(req, res) {
  var map = plates.Map();  
  map["class"]('btn-danger').to('number');
  map.where('href').is('xxx').as('href').to('link');
  
    res.render('index', {
        data: {
            number: "Call Now: " + number,
            link: "tel:" + number
        },
        map: map
    });
});

// Serve image resources
app.use(serveStatic('views'));

var server = app.listen(cfenv.getAppEnv().port, function () {

  var host = server.address().address
  var port = server.address().port

  log.info('Example app listening at http://%s:%s', host, port)

})