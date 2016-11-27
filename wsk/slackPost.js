var request = require('request');

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


/**
 * Action to post to slack
 *  @param {string} url - Slack webhook url
 *  @param {string} channel - Slack channel to post the message to
 *  @param {string} username - name to post to the message as
 *  @param {string} text - message to post
 *  @param {string} icon_emoji - (optional) emoji to use as the icon for the message
 *  @param {string} as_user - (optional) when the token belongs to a bot, whether to post as the bot itself
 *  @param {object} attachments - (Optional) message attachments 
 *  @return {object} whisk async
 */

function main(params){

	if (checkParams(params)){
		
		d = params.result;
		
		console.log('Result: ', d);
		for(var i=0,len=d.length; i<len; i++){
			d[i]['garbled_lines'] = utils.decodeStrings(d[i]['garbled_lines']);
		}
		console.log('Decoded Result: ', d);
		
		var body = {
			channel: params.channel,
			username: params.username || 'Simple Message Bot',
			text: format(JSON.stringify(d, null, '\t'))
		};

		if (params.icon_emoji){
			body.icon_emoji = params.icon_emoji;
		}

		if (params.token){
			//
			// this allows us to support /api/chat.postMessage
			// e.g. users can pass params.url = https://slack.com/api/chat.postMessage
			//				  and  params.token = \u003ctheir auth token\u003e
			//
			body.token = params.token;
		} else {
			// 
			// the webhook api expects a nested payload
			//
			// Notice that we need to stringify; this is due to limitations
			// of the formData npm: it does not handle nested objects
			//
			console.log(body);
			console.log("to: "+ params.url);
			body = {
				payload: JSON.stringify(body)
			};

		}

		if (params.as_user === true){
			body.as_user = true;
		}

		if (params.attachments) {
			body.attachments = params.attachments;
		}

		var promise = new Promise(function(resolve, reject){
			request.post({
				url: params.url,
				formData: body,			
			}, function(err, res, body) {
				if (err) {
					console.log('Error: ', err, body);
					reject(err);
				} else {
					console.log('Success: ', params.text, ' successfully sent');
					resolve();
				}
			});
		});

		return promise;
	}
}


/**
 *
 * Checks if all required params are set
 */

function checkParams(params){

	console.log('Post2Slack params: ', params);

	if (params.result === undefined) {
		whisk.error('No post data provided');
		return false;
	}

	if (params.url === undefined) {
		whisk.error('No webhook URL provided');
		return false;
	}

	if (params.channel === undefined) {
		whisk.error('No channel provided');
		return false;
	}

	return true;
}

/**
 * format text to slack
 */

function format(str){
	return '\n\`\`\`'+str+'\n\`\`\`';
}
