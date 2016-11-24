# Sample Mobile App for GarbageCodeDetection as a service
This mobile sample uses Cordova SDK to develop hybrid mobile app based on the web sample app.

### Prerequisites:
##### 1. Install Node.js 
Download from: http://nodejs.org

##### 2. Install Cordova SDK
```sh
npm install -g cordova
```
##### 3. For Android platform, install Android Studio and Android SDK
See https://developer.android.com/studio/index.html

##### 4. For iOS platform, install XCode from Apple App store.   (On Mac OS X only.)
See https://itunes.apple.com/en/app/xcode/id497799835?mt=12


### Steps to build/run the sample app:
##### 1. Clone the Garbage.Code.Detection.As.a.Service project.
```sh
git clone https://hub.jazz.net/git/exam12/Garbage.Code.Detection.As.a.Service
```

##### 2. Open CLI and get into SampleApp/MobileApp folder
This is the root directory of the cordova project.
```sh
cd SampleApp/MobileApp
```

##### 3. Add target platform to the Cordova project
Type command: **cordova platform add <platform>**. 
For example, to work on Andorid platform, use following command: 
```sh
cordova platform add android
```

##### 4. Build for your target platform
Type command: **cordova build <platform>**.
For example, to work on Andorid platform, use following command:
```sh
cordova build android
```

##### 5. Run/Launch the sample app
Type command: **cordova run <platform>**.
For example, to work on Andorid platform, use following command: 
```sh
cordova run android
```


### Use Android Studio:
Following the steps to open the project in Android Studio:
- Open Android Studio and select "Open an existing Android Studio project".
- Choose the project root at "sampleApp/MobileApp/platform/android" to open

