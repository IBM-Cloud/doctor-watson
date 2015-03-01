var cfenv = require('cfenv'),
  twilio = require('twilio'),
  xmlparser = require('express-xml-bodyparser'),
  bodyParser = require('body-parser'),
  serveStatic = require('serve-static'),
  log = require('loglevel');

var service = cfenv.getAppEnv().getService("twilio");

var client = twilio(service.credentials.accountSID, service.credentials.authToken);
var number = "Unavailable";

// Access look up the first phone number bound to the account
client.incomingPhoneNumbers.list(function (err, response) {
  if (err) {
    log.error(err);  
    return;
  }

  number = response.incoming_phone_numbers[0].phone_number;
});

module.exports = function (app) {
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(xmlparser());

  // Hook up REST API for responding to incoming calls
  app.use('/calls', require('./calls.js'));
    
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
};