var request = require('request');
var http = require("http");
var querystring = require('querystring');

var utils = {
	
	map : function(arr, func){
	
		var res = [];
		for(var i=0,len=arr.length; i<len; i++){
			res.push(func(arr[i]));
		}
		return res;
	},

	encodeStrings : function(arr){
		return utils.map(arr, querystring.escape);
	},
	
	decodeStrings : function(arr){
		return utils.map(arr, decodeURI);
	},
	
};

function main(params) {

	// payload is urls with ',' split, such as "url1,url2"
	var payload = params["payload"].split(',') || [];
	var data=[];

	for(var i=0,len=payload.length; i<len; i++){
		data.push({'url': payload[i]});
	}
	
	console.log(data);

	var options = {  
	    host: 'garbagecodedetection.mybluemix.net',
	    port: 80,
	    path: '/rest/garbagechar_scan',
	    method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		}
	};
	
	var req = http.request(options, function (res) {  
	
	    res.on('data', function (message) {  
	        var ret= eval('(' + message + ')');  
	        console.log('response : ' ,ret);
	
			console.log('response type: ', typeof ret);

			for(var i=0; i<ret.length; i++) {
				ret[i]['garbled_lines'] = utils.encodeStrings(ret[i]['garbled_lines']); 
			}

			console.log('Encoded response: ', ret)
			whisk.done({result: ret});
	    });  
	  
	});

	req.on('error', function(e) {  
	    console.log('problem with request: ' + e.message);
		whisk.done({text: 'Problem with request' + e.message});
	});  
	  
	// write data to request body  
	req.write(JSON.stringify(data));
	req.end(); 

	return whisk.async();
}
