## OpenWhisk implementation

### Create git repository for sample application
Refer to [garbage-test-app](https://github.com/icnbrave/garbage-test-app)

### Deploy sample application to bluemix as static website
```
$ cf api https://api.ng.bluemix.net
$ cf login <with you bluemix ID>
$ git clone https://github.com/icnbrave/garbage-test-app.git
$ cd garbage-test-app
$ touch Staticfile
$ echo "directory:visible" > Staticfile
$ cf push garbage-test-app -b https://github.com/cloudfoundry/staticfile-buildpack.git
```
### Openwhisk - Github
  1. Create package binding for openwhisk github for sample application
  
  ```
  $ wsk package update myGit -p repository icnbrave/garbage-test-app -p accessToken <GITHUB_ACCESSTOKEN> -p username <GITHUB_USERNAME>
  ```
  2. Create trigger with push event
  
  ```
  $ wsk trigger create gitTrigger --feed myGit/webhook -p events push
  ```
  after the trigger has been created successfully, the trigger url will be added to webhooks of icnbrave/garbage-test-app in github. 
  
### OpenWhisk - Create an action to recieve payload from github push event

  1.  Create recPayloadFromGit.js as below

  ```
    function main(params){
        return {payload: params};
     }
  ```

  2.  Create recPayloadFromGitAction with recPayloadFromGit.js

  `$ wsk action create recPayloadFromGitAction recPayloadFromGit.js`

  3.  Create rule RecPayloadRule to associate gitTrigger with recPayloadFromGitAction

  `$ wsk rule create RecPayloadRule gitTrigger recPayloadFromGitAction`

  4.  Then any new push event to garbage-test-app repository, trigger gitTrigger will be fired and action recPayloadFromGitAction will be triggerred.
  Event payload information can be refered in (Github events and payload)[https://developer.github.com/v3/activity/events/types/]
  
### Garbage detection API

API: http://garbagecodedetection.mybluemix.net/rest/garbagechar_scan
HTTP Mathod: POST
Data: jsonArrayString, for example:
```
[
    {
        "url": "http://garbagecodedetection.mybluemix.net/test/garbledUTF8-2.html",
        "encoding": "UTF-8",
    },
    {
        "url": "http://garbagecodedetection.mybluemix.net/test/garbledBig5.html",
        "encoding": "Big5",
    }
]
```
url is required, and encoding is optional.

So create action garbageDetectionAction with garbageDetection.js
`$ wsk action create garbageDetectionAction garbageDetection.js`

Test garbageDetectionAction action
`$ wsk`
