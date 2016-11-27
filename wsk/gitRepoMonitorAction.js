/**
 * Git repository event monitoring service as an OpenWhisk action.
 *
 */

function main(params) {
	var payload = params.payload || 'http://garbagecodedetection.mybluemix.net/test/garbledUTF8-2.html,http://garbagecodedetection.mybluemix.net/test/garbledBig5.html';
	var separator = params.separator || ',';
	return {payload: payload, separator: separator};
}
