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

`$ wsk action invoke garbageDetectAction --blocking --result -p payload http://garbagecodedetection.mybluemix.net/test/garbledUTF8-2.html,http://garbagecodedetection.mybluemix.net/test/garbledBig5.html`

```
{
    "result": [
        {
            "doc_charset": "UTF-8",
            "garbagechar_found": true,
            "garbled_lines": [
                "您可以註冊 ���試123"
            ],
            "url": "http://garbagecodedetection.mybluemix.net/test/garbledUTF8-2.html"
        },
        {
            "doc_charset": "Big5",
            "garbagechar_found": true,
            "garbled_lines": [
                "?�鞎�????"
            ],
            "url": "http://garbagecodedetection.mybluemix.net/test/garbledBig5.html"
        }
    ]
}
```

### OpenWhisk - Send garbage detect result to slack
1. Configure Slack (incoming webhook)[https://api.slack.com/incoming-webhooks] for your team. After Slack is configured, you get a webhook URL that looks like `https://hooks.slack.com/services/aaaaaaaaa/bbbbbbbbb/cccccccccccccccccccccccc` 
2. Create customized package with your Slack credentials
`$ wsk package create mySlack --param url "https://hooks.slack.com/services/..." --param username Bob --param channel "#MySlackChannel"`
3. Customize slack post action with slackPost.js file
`$ wsk action create mySlack/post2slack slackPost.js`
4. Create a action sequence git2slack to chain actions garbageDetectionAction and post2slack
`$ wsk action create git2slack --sequence garbageDetectionAction,mySlack/post2slack`
5. Test sequence git2slack
`$  wsk action invoke git2slack --blocking --result -p payload http://garbagecodedetection.mybluemix.net/test/garbledUTF8-2.html,http://garbagecodedetection.mybluemix.net/test/garbledBig5.html`

Then the garbage detect result will be sent to slack

### Read changes from github payload and send to git2slack action

All above test data is static, how to get changed or added files from a specified repository?

Create action getPushPayloadAction with below file getPushPayload.js
`$ wsk action create getPushPayloadAction getPushPayload.js`

Add getPushPayloadAction to git2slack sequence.
`$ wsk action update git2slack getPushPayloadAction,`

Update git2slackRule rule
```
$ wsk rule disable git2slackRule
$ wsk rule update git2slackRule gitTrigger getPushPayloadAction
$ wsk rule enable git2slackRule
```
