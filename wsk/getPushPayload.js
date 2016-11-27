function main(params){
	var testAppUrl = "https://garbagetestapp.mybluemix.net/";

	var head_commit = params["head_commit"] || "";
	var files = [];

	if(head_commit != ""){
		files=files.concat(head_commit["added"]);
		files=files.concat(head_commit["modified"]);
	}

	console.log("files: ", files);
	// files map to test app link
	var urls=[];
	for(var i=0,len=files.length; i<len; i++){
		urls.push(testAppUrl + files[i]);
	}

	return {payload: urls.join(",")};
}
