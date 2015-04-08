Doctor Watson
=============

BlueMix application using Watson Cloud Services with Twilio to create your own doctor on the phone.

Live version available: <a href="http://doctor-watson.mybluemix.net">http://doctor-watson.mybluemix.net</a>

<a href="https://bluemix.net/deploy?repository=https://github.com/jthomas/doctor-watson" target="_blank"><img src="http://bluemix.net/deploy/button.png" alt="Bluemix button" />

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

Setting up on Bluemx
--------------------

Pushing this application to Bluemix will allow you to run your own version of Doctor Watson. The following services need to be available, the application will automatically bind to them at runtime... 

Service (service identifiter)
* Twilio (twilio)
* Watson Speech To Text (speech_to_text)
* Watson Q&A API (question_and_answer)

Once these services are availble, the following command line will start your new version of Doctor Watson running.

> $ cf push your_app_name

When the deployment has finished, your application will be available at your_app_name.mybluemix.net

Setting up Twilio
--------------------

Once the application has ben deployed, you need to register the API endpoints with Twilio.
Using the Twilio [configuration page](https://www.twilio.com/user/account/phone-numbers/incoming), set the sample 
phone number "Request URL" to HTTP POST incoming requests to http://your_app_name.mybluemix.net/calls for Voice 
and http://your_app_name.mybluemix.net/sms for Messaging

Running locally
--------------------

Running the application on your local machine for development is supported. 
Ensure you the VCAP_SERVICES environment variable set with the credential details from the remote environment. 

> $ node app.js
