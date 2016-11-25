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
