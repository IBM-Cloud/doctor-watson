var watson = require('watson-developer-cloud'),
  log = require('loglevel'),
  cfenv = require('cfenv')

var service = cfenv.getAppEnv().getService('question_and_answer')

var question_and_answer_healthcare = watson.question_and_answer({
  username: service.credentials.username,
  password: service.credentials.password,
  version: 'v1',
  dataset: 'healthcare'
})

exports.ask = function (question, cb) {
  question_and_answer_healthcare.ask({ text: question}, function (err, response) {
    if (err || !response[0].question.evidencelist) {
      log.error(err)
      cb("Unfortunately, I'm unable to answer your question.")
      return
    }

    cb(response[0].question.evidencelist[0].text)
  })
}
