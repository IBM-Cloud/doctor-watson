var express = require('express'),
  twilio = require('twilio'),
  cfenv = require('cfenv'),
  speech = require('../lib/speech.js'),
  doctor = require('../lib/doctor.js'),
  log = require('loglevel')

var service = cfenv.getAppEnv().getService('twilio')

var twilio_auth_token = service.credentials.authToken
var client = twilio(service.credentials.accountSID, service.credentials.authToken)

var router = express.Router()

// Used to store a map from call_ssid -> answers
var answers = {}

// Callback soup stitching together API services used to
// convert between an audio recording -> text -> watson answer.
var enqueue_question = function (recording) {
  var audio_location = recording.RecordingUrl,
    call_ssid = recording.CallSid

  speech.text(audio_location, function (question) {
    log.info(call_ssid + ' QUESTION: ' + question)
    doctor.ask(question, function (answer) {
      log.info(call_ssid + ' ANSWER: ' + answer)
      answers[call_ssid] = answer

      var forward_to = cfenv.getAppEnv().url + '/calls/answer'
      client.calls(call_ssid).update({
        // BUG: HTTPS locations are getting a 403 sent back...
        url: forward_to.replace('https', 'http')
      })
    })
  })
}

// Twilio callback handling. Set up routes for different parts of the phone
// call.
router.post('/', twilio.webhook(twilio_auth_token), function (req, res) {
  log.info(req.body.CallSid + '-> calls/')
  log.debug(req.body)

  var twiml = new twilio.TwimlResponse()
  twiml.say('Hello this is Doctor Watson, how can I help you? Press any key after you have finished speaking')
    .record({timeout: 60, action: '/calls/recording'})

  res.send(twiml)
})

router.post('/holding', twilio.webhook(twilio_auth_token), function (req, res) {
  log.info(req.body.CallSid + '-> calls/holding')
  log.debug(req.body)

  var twiml = new twilio.TwimlResponse()
  twiml.pause({length: 5})
    .say("I'm still thinking")
    .redirect('/calls/holding')

  res.send(twiml)
})

router.post('/recording', twilio.webhook(twilio_auth_token), function (req, res) {
  log.info(req.body.CallSid + '-> calls/recording')
  log.debug(req.body)

  var twiml = new twilio.TwimlResponse()

  enqueue_question(req.body)

  twiml.say('Let me think about that.').redirect('/calls/holding')
  res.send(twiml)
})

router.post('/answer', twilio.webhook(twilio_auth_token), function (req, res) {
  log.info(req.body.CallSid + '-> calls/answer')
  log.debug(req.body)

  var twiml = new twilio.TwimlResponse()

  twiml.say(answers[req.body.CallSid])
    .say('Do you have another question?')
    .record({timeout: 60, action: '/calls/recording'})

  res.send(twiml)
})

module.exports = router
