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
`$ wsk package create myCustomSlack --param url "https://hooks.slack.com/services/..." --param username Bob --param channel "#MySlackChannel"`
3. Customize slack post action with slackPost.js file
`$ wsk action create myCustomSlack/post2slack slackPost.js`
4. Create a action sequence git2slack to chain actions garbageDetectionAction and post2slack
`$ wsk action create git2slack --sequence garbageDetectionAction,myCustomSlack/post2slack`
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

Modify garbledUTF8-2.html, and add garbledUTF8-3.html in test sample application, and issue `cf push garbage-test-app -b https://github.com/cloudfoundry/staticfile-buildpack.git` command to deploy application to bluemix; and then push commit to repository, below payload will be gotton from getPushPayloadAction which is what we want
```
"result": {
            "payload": "https://garbagetestapp.mybluemix.net/garbledUTF8-3.html, https://garbagetestapp.mybluemix.net/garbledUTF8-2.html"
        }
```

### Upload git2slack sequence

Update git2slack to chain getPushPayloadAction, garbageDetectionAction, and mySlack/post2slack

`$ wsk action update git2slack --sequence getPushPayloadAction,garbageDetectAction,myCustomSlack/post2slack`

Update git2slackRule 

```
wsk rule disable git2slackRule
wsk rule update git2slackRule gitTrigger git2slack
wsk rule enable git2slackRule
```

When you modify garbledUTF8-2.html, and push to repository, garbage detection result will be sent to slack as below:

```
[
    {
        "url": "https://garbagetestapp.mybluemix.net/garbledUTF8-2.html",
        "garbagechar_found": true,
        "doc_charset": "UTF-8",
        "garbled_lines": [
            "????? ????123"
        ]
    }
]
```

As you see, the unicode characters are corrupted. The reason of corruption is that the unicode char is not supported by current openwhisk version, refer to http://stackoverflow.com/questions/36812389/openwhisk-character-sets. However, we can encode all unicode char during transferring data between actions, refer to https://github.com/openwhisk/openwhisk/issues/252 for workaround.

After encoding result of garbage detect api in garbageDetectionAction.js
```
 56             for(var i=0; i<ret.length; i++) {
 57                 ret[i]['garbled_lines'] = utils.encodeStrings(ret[i]['garbled_lines']);
 58             }
```
And decoding the string sent to slack in slackPost.js
```
 44         for(var i=0,len=d.length; i<len; i++){
 45             d[i]['garbled_lines'] = utils.decodeStrings(d[i]['garbled_lines']);
 46         }
```

Update garbageDetectionAction, myCustomSlack/post2slack, and git2slack sequence.
```
  1 #!/bin/bash
  2
  3 wsk action update garbageDetectAction
  4 wsk action update myCustomSlack/post2slack
  5 wsk action update --sequence mygit2slack getPushPayloadAction,garbageDetectAction,myCustomSlack/post2slack
  6
  7 wsk rule disable git2slackRule
  8 wsk rule update git2slackRule gitTrigger mygit2slack
  9 wsk rule enable git2slackRule
```
Then, the correct result will be display to slack.
```
[
    {
        "url": "http://garbagecodedetection.mybluemix.net/test/garbledUTF8-2.html",
        "garbagechar_found": true,
        "doc_charset": "UTF-8",
        "garbled_lines": [
            "您可以註冊 ���試123"
        ]
    },
]
```
