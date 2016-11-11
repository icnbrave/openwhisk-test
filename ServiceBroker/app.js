/*
 * Sample v2 node.js express service broker.
 * 
 * This sample can be deployed to CloudFoundry as an application as well.
 * 
 * The URL paths herein (other than the GET /) are mandated by CloudFoundry.
 */
var express     = require("express");
var fs          = require("fs");
var http        = require("http");
var https       = require("https");
var querystring = require("querystring");
var url         = require("url");
var uuid        = require("node-uuid");

var util		= require('util');


var PORT = 3000;
var SERVICE_BROKER_USER     = "TestServiceBrokerUser";
var SERVICE_BROKER_PASSWORD = "TestServiceBrokerPassword";

// TODO - api URL if not running as bluemix app.
var API = "https://api.192.168.91.129.xip.io";

var CLIENT_ID     = "c6b3bacd-5cec-49e5-8428-653fb3d60d19";
var CLIENT_SECRET = "c9b0d56c-7f98-4333-b36b-b438bcbd223d";

var SERVICE_ID	  = "109dc1e6-64d5-4be4-929b-95ba93b88ecb";
var SERVICE_PLAN_ID = "79d2c928-4037-4731-8166-8c5dab8abc31";

var configure = function() 
{
    expressServer.use(express.bodyParser());

    // Set public folder for ACE icons and instructions from metadata
    expressServer.use(express.static(__dirname + "/public"));

    expressServer.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
    expressServer.use(expressServer.router);
};

var connected = function()
{
    console.log("Node server started on %s", Date(Date.now()));
};

// Looking at the calling code within CloudFoundry, self-signed certificates are not supported
// Self-signed certificate generated with the following command:
// openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
/*
var sslkey  = fs.readFileSync("key.pem");
var sslcert = fs.readFileSync("cert.pem");
            
var options = 
{
    key :sslkey,
    cert:sslcert
};
*/

var checkContentType = function(request, response)
{
    if (request.is("json"))
    {
        return;
    }
    
    var json = 
    {
        description : "Content-Type must be application/json"
    };
    
    response.json(415, json);
    
    throw json;
};

var checkAccept = function(request, response)
{
    if (request.accepts("json"))
    {
        return;
    }
    
    var json = 
    {
        description : "Accept type must be application/json"
    };
    
    response.json(406, json);
    
    throw json;
};

var getObject = function(json, name, response)
{
    var value = json[name];

    if (value == undefined) 
    {
        var jsonError = 
        {
            description : name + " not found in JSON payload"
        };
        
        response.json(400, jsonError);
        
        throw jsonError;
    }
    
    return value;
};

var getBoolean = function(json, name, response)
{
    var value = getObject(json, name, response);

    if (!(typeof value == "boolean"))
    {
        var jsonError = 
        {
            description : name + " must be Boolean"
        };
        
        response.json(400, jsonError);
        
        throw jsonError;
    }
    
    return value;
};

var getJSON = function(json, name, response)
{
    var value = getObject(json, name, response);

    if (!(typeof value == "object"))
    {
        var jsonError = 
        {
            description : name + " must be a JSON object"
        };
        
        response.json(400, jsonError);
        
        throw jsonError;
    }
    
    return value;
};

var getString = function(json, name, response)
{
    var value = getObject(json, name, response);

    var text = null;
    
    if (!(typeof value == "string"))
    {
        text = name + " must be string";
    }
    else if (value.trim().length == 0)
    {
        text = name + " cannot be empty";
    }
    
    if (text)
    {
        var jsonError = 
        {
            description : text
        };
        
        response.json(400, jsonError);
        
        throw jsonError;
    }
    
    return value;
};

var getAPI = function(request)
{
    // If running as a bluemix app, can calculate the api entry point.  Otherwise, using constant.
	/*
    if (process.env.VCAP_APP_PORT)
    {
        var hostSplits = request.host.split(".");
        hostSplits[0]  = "api";
        newHost        = hostSplits.join(".");

		return request.protocol + "://" + newHost;
    }
    
    return API;
	*/
	return "https://api.stage1.ng.bluemix.net"
};

var getSSORedirectURI = function(request)
{
    return request.protocol + "://" + request.get("host") + "/sso_dashboard";
};

var doHTTP = function(urlString, method, authorization, contentType, content, response, callback)
{
    var localCallback = function(localResponse)
    {
        try
        {
            localResponse.on("error", function(error)
            {
                console.log("Got error: %s", error);
 
                var jsonError = 
                {
                    description : "Error: " + error
                };
            
                response.json(500, jsonError);
                
                throw jsonError;
            });
 
            var data = null;
 
            localResponse.on("data", function(chunk)
            {
                if (data == null)
                {
                    data = chunk;
                }
                else
                {
                    data = data + chunk;
                }
            });
 
            localResponse.on("end", function()
            {
                var json = null;
                
                if (data != null)
                {
                    json = JSON.parse(data);
                }
                
                var statusCode = localResponse.statusCode;
                
                if (statusCode == 200)
                {
                    console.log("%s to %s successful.  Response: %j", method, urlString, json);
                    
                    callback(json);
                }
                else if (statusCode == 401)
                {
                    console.log("%s to %s is unauthorized.  Response: %j", method, urlString, json);

                    callback(null);
                }
                // TODO - Treating not found as unauthorized
                else if (statusCode == 404)
                {
                    console.log("%s to %s is not found.  Response: %j", method, urlString, json);

                    callback(null);
                }
                else
                {
                    var jsonError = 
                    {
                        description : "Unexpected return code from url " + urlString + " is " + statusCode
                    };
        
                    response.json(statusCode, jsonError);
                    
                    throw jsonError;
                }
            });
        }
        catch(exception)
        {
            console.log(exception);
        }
    };

    var parsedUrl = url.parse(urlString);

    var requestor = http;

    if (parsedUrl.protocol == "https:")
    {
        requestor = https;
    }
    
    var headers = 
    {
        "accept" : "application/json"
    };
    
    if (authorization != null)
    {
        headers["authorization"] = authorization;
    }
    
    if (contentType != null)
    {
        headers["content-type"] = contentType;
    }
    
    if (content != null)
    {
        headers["content-length"] = content.length;
    }

    var options = 
    {
        host   : parsedUrl.host, 
        port   : parsedUrl.port, 
        path   : parsedUrl.path, 
        method : method, 
        headers: headers,
        rejectUnauthorized: false // TODO - Turning off ssl verify by default.  Turn back on if valid certificate
    };

    var localRequest = requestor.request(options, localCallback);
    
    if (content != null)
    {
        localRequest.write(content);
    }
    
    localRequest.end();
};

var authorizationEndpoint = function(request, response, callback)
{
    var urlString = getAPI(request) + "/v2/info";
   
	//var urlString = "https://api.stage1.ng.bluemix.net/v2/info";
	//var urlString = "https://api.stage1.ng.bluemix.net";

	console.log("--------------urlString: " + urlString);

    var localCallback = function(json)
    {
        try
        {
            if (json == null)
            {
                var jsonError = 
                {
                    description : "Unable to retrieve from " + urlString
                };
                
                response.json(500, jsonError);
                
                throw jsonError;
            }
            
            callback(getString(json, "authorization_endpoint", response));
        }
        catch(exception)
        {
            console.log(exception);
        }
    };
    
    doHTTP(urlString, "GET", null, null, null, response, localCallback);
};

var accessToken = function(request, response, authorizationEndpoint, code, callback)
{
    var urlString = authorizationEndpoint + "/oauth/token";
    
    var authorization = "Basic " + new Buffer(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64");
    
    var content = querystring.stringify(
    {    
        "client_id"    : CLIENT_ID,
        "grant_type"   : "authorization_code",
        "code"         : code,
        "redirect_uri" : getSSORedirectURI(request)
    });
    
    var localCallback = function(json)
    {
        try
        {
            if (json == null)
            {
                callback(null);
            }
            else
            {
                var tokenType   = getString(json, "token_type",   response);
                var accessToken = getString(json, "access_token", response);
                
                console.log("accessToken: %s", accessToken);
        
                callback(tokenType + " " +  accessToken);
            }
        }
        catch(exception)
        {
            console.log(exception);
        }
    };
    
    doHTTP(urlString, "POST", authorization, "application/x-www-form-urlencoded", content, response, localCallback);
};

var manageServiceInstance = function(request, response, accessToken, instanceId, callback)
{
    var urlString = getAPI(request) + "/v2/service_instances/" + instanceId + "/permissions";

    var localCallback = function(json)
    {
        try
        {
            if (json == null)
            {
                callback(false);
            }
            else
            {
                callback(getBoolean(json, "manage", response));
            }
        }
        catch(exception)
        {
            console.log(exception);
        }
    };
    
    doHTTP(urlString, "GET", accessToken, null, null, response, localCallback);
};

// GET for testing.  Not invoked by CloudFoundry.
var get = function(request, response)
{
    console.log("GET request headers: %j", request.headers);
    
    response.json("This is a test");
};

var catalog = function(request, response)
{
    console.log("Catalog GET request headers: %j", request.headers);
    
    try
    {
        checkAccept(request, response);

        var baseMetadataUrl = request.protocol + "://" + request.get("host") + "/";

        var result = 
        {
            services :
            [
                {
                    bindable         : true,
                    // Each service requires its own unique dashboard_client id
                    // TODO - Automatically-created dashboard clients not working with current Bluemix Login Server.  Get admin to manually create for now.
                    
                    dashboard_client :
                    {
                        id           : CLIENT_ID,
                        secret       : CLIENT_SECRET,
                        redirect_uri : getSSORedirectURI(request)
                    },
                    
                    description      : "UXL Service Broker",
                    // TODO - GUID generated by http://www.guidgenerator.com  new id
                    id               : SERVICE_ID, 
                    metadata         : 
                    {
                        displayName      : "UXL Service Broker Display Name",
                        documentationUrl : baseMetadataUrl + "documentation.html",
                        featuredImageUrl : baseMetadataUrl + "servicesample64.png",
                        imageUrl         : baseMetadataUrl + "servicesample50.png",
                        instructionsUrl  : baseMetadataUrl + "servicesample.md",
                        longDescription  : "UXL Service Broker Long Description",
                        mediumImageUrl   : baseMetadataUrl + "servicesample32.png",
                        smallImageUrl    : baseMetadataUrl + "servicesample24.png"
                    },
                    name             : "etservicebroker",
                    // TODO - Ensure this value is accurate for your service.  Requires PATCH of /v2/service_instances/:instance_id below
                    plan_updateable  : true,
                    tags             : ["tag1a", "tag1b"],
                    plans            :
                    [
                        {
                            description : "default",
                            free        : true,
                            // TODO - GUID generated by http://www.guidgenerator.com new id
                            id          : SERVICE_PLAN_ID t,
                            metadata    :
                            {
                                displayName : "default"
                            },
                            name        : "etservicebroker"
                        }
                    ]
                }
            ]
        };
        
        console.log("Catalog GET result: %j", result);
        
        response.json(200, result);
    }
    catch(exception)
    {
        console.log(exception);
    }
};

var provision = function(request, response)
{
    console.log("Provision PUT request headers: %j", request.headers);
    
    try
    {
        checkContentType(request, response);
        checkAccept(request, response);
        
        var instanceId = request.params.instance_id;
        
        console.log("Provision PUT instance_id: %s", instanceId);
       
        var body = request.body;
        
        console.log("Provision PUT body: %j", body);
        
        var s    = JSON.stringify(request.body);
        var json = JSON.parse(s);
        
        var organizationGuid = getString(json, "organization_guid", response);
        var planId           = getString(json, "plan_id", response);
        var serviceId        = getString(json, "service_id", response);
        var spaceGuid        = getString(json, "space_guid", response);
        
        // TODO - Do your actual work here
        
        var result = 
        {
            dashboard_url : request.protocol + "://" + request.get("host") + "/dashboard/" + instanceId
        };
        
        console.log("Provision PUT result: %j", result);
        
        response.json(200, result); // Return 409 if already provisioned at this url
    }
    catch(exception)
    {
        console.log(exception);
    }
};

var bind = function(request, response)
{
    console.log("Bind PUT request headers: %j", request.headers);
    
    try
    {
        checkContentType(request, response);
        checkAccept(request, response);
        
        var instanceId = request.params.instance_id;
        var bindingId  = request.params.binding_id;

        console.log("Bind PUT instanceId: %s", instanceId);
        console.log("Bind PUT bindingId: %s", bindingId);
        
        var body = request.body;
        
        console.log("Bind PUT body: %j", body);
        
        var s    = JSON.stringify(request.body);
        var json = JSON.parse(s);
        
        var appGuid   = getString(json, "app_guid", response);
        var serviceId = getString(json, "service_id", response);
        var planId    = getString(json, "plan_id", response);
        
        // TODO - Do your actual work here
        
        var generatedUserid   = uuid.v4();
        var generatedPassword = uuid.v4();
        
        var result = 
        {
            credentials : 
            {
                userid   : generatedUserid,
                password : generatedPassword
            }
        };
          
        console.log("Bind PUT result: %j", result);
          
        response.json(200, result); // Return 409 if already bound at this url
    }
    catch(exception)
    {
        console.log(exception);
    }
};

var unbind = function(request, response)
{
    console.log("Unbind DELETE request headers: %j", request.headers);
    
    try
    {
        checkAccept(request, response);

        var instanceId = request.params.instance_id;
        var bindingId  = request.params.binding_id;
        var serviceId  = request.query.service_id;
        var planId     = request.query.plan_id;

        console.log("Unbind DELETE instanceId: %s", instanceId);
        console.log("Unbind DELETE bindingId: %s", bindingId);
        console.log("Unbind DELETE serviceId: %s", serviceId);
        console.log("Unbind DELETE planId: %s", planId);
          
        // TODO - Do your actual work here
        
        var result = {};
        
        console.log("Unbind DELETE result: %j", result);
        
        response.json(200, result); // Return 410 with body of {} if deleted
    }
    catch(exception)
    {
        console.log(exception);
    }
};

var unprovision = function(request, response)
{
    console.log("Unprovision DELETE request headers: %j", request.headers);

    try
    {
        checkAccept(request, response);

        var instanceId = request.params.instance_id;
        var serviceId  = request.query.service_id;
        var planId     = request.query.plan_id;

        console.log("Unprovision DELETE instanceId: %s", instanceId);
        console.log("Unprovision DELETE serviceId: %s", serviceId);
        console.log("Unprovision DELETE planId: %s", planId);
          
        // TODO - Do your actual work here
        
        var result = {};
        
        console.log("Unprovision DELETE result: %j", result);
        
        response.json(200, result); // Return 410 with body of {} if deleted
    }
    catch(exception)
    {
        console.log(exception);
    }
};

var update = function(request, response)
{
    console.log("Update PATCH request headers: %j", request.headers);
    
    try
    {
        checkContentType(request, response);
        checkAccept(request, response);
        
        var instanceId = request.params.instance_id;
        
        console.log("Update PATCH instance_id: %s", instanceId);
       
        var body = request.body;
        
        console.log("Update PATCH body: %j", body);
        
        var s    = JSON.stringify(request.body);
        var json = JSON.parse(s);

        var planId           = getString(json, "plan_id", response);
        var previousValues   = getJSON(json, "previous_values", response);
        var organizationGuid = getString(previousValues, "organization_guid", response);
        var previousPlanId   = getString(previousValues, "plan_id", response);
        var serviceId        = getString(previousValues, "service_id", response);
        var spaceGuid        = getString(previousValues, "space_guid", response);
        
        // TODO - Do your actual work here
        
        var result = {};
        
        console.log("Update PATCH result: %j", result);
        
        response.json(200, result); // Return 422 if this service instance does not support service plan update with result body including description field
    }
    catch(exception)
    {
        console.log(exception);
    }
};

var dashboard = function(request, response)
{
    console.log("Dashboard GET request headers: %j", request.headers);
    
    try
    {
        var instanceId = request.params.instance_id;

        console.log("Dashboard GET instanceId: %s", instanceId);

        // TODO - state below should be a random lookup value to an instanceId to add security.
        // Simplified here to include instanceId to make this sample stateless.

        // TODO - minimal scope needed right now for /v2/service_instances/:guid/permissions is fluid.  Will specify when this settles down.
        var authorizationEndpointCallback = function(authorizationEndpointResult)
        {
			var redirectUri2 = "https://console.stage1.ng.bluemix.net/docs/developing/index.html";
            var redirectUri = authorizationEndpointResult + 
                              "/oauth/authorize?state=" + 
                              instanceId + 
                              "&response_type=code&client_id=" + 
                              CLIENT_ID + 
                              "&redirect_uri=" + 
                              getSSORedirectURI(request);
            
            console.log("DashBoard GET redirectURI: %s", redirectUri);

			//response.send("You can manage this service instance");

            response.redirect(redirectUri);
        };

        authorizationEndpoint(request, response, authorizationEndpointCallback);
    }
    catch(exception)
    {
        console.log(exception);
    }
};

var sso_dashboard = function(request, response)
{
    console.log("SSO_Dashboard GET request headers: %j", request.headers);

    try
    {
        var code  = request.query.code;
        var state = request.query.state;

        console.log("SSO Dashboard GET code: %s", code);
        console.log("SSO Dashboard GET state: %s", state);

        var manageServiceInstanceCallback = function(manageServiceInstanceResult)
        {
            if (manageServiceInstanceResult)
            {
                // TODO - Add your actual administrative page here instead of the string below
                response.send("You can manage this service instance");
            }
            else
            {
                response.send(401, "You are not authorized to manage this service instance");
            }
        };

        var accessTokenCallback = function(accessTokenResult)
        {
            if (accessTokenResult == null)
            {
                response.send(401, "You are not authorized to manage this service instance");
            }
            else
            {
                manageServiceInstance(request, response, accessTokenResult, state, manageServiceInstanceCallback);
            }
        };

        var authorizationEndpointCallback = function(authorizationEndpointResult)
        {
            accessToken(request, response, authorizationEndpointResult, code, accessTokenCallback);
        };

        authorizationEndpoint(request, response, authorizationEndpointCallback);
    }
    catch(exception)
    {
        console.log(exception);
    }
};

/*
 * IBM BlueMix Enablement Extension:  enable service instance
 */
var enable = function(request, response)
{
    console.log("Enable PUT request headers: %j", request.headers);

    try
    {
        checkContentType(request, response);

        var instanceId = request.params.instance_id;

        console.log("Enable PUT instance_id: %s", instanceId);

        var body = request.body;

        console.log("Enable PUT body: %j", body);

        var s    = JSON.stringify(request.body);
        var json = JSON.parse(s);

        var enabled = getBoolean(json, "enabled", response);

        // TODO - Do your actual work here

        response.json(204);
    }
    catch(exception)
    {
        console.log(exception);
    }
};

/*
 * IBM BlueMix Enablement Extension:  service instance state inquiry
 */
var state = function(request, response)
{
    console.log("State GET request headers: %j", request.headers);

    try
    {
        checkAccept(request, response);

        var instanceId = request.params.instance_id;

        console.log("State GET instance_id: %s", instanceId);

        var result = 
        {
            // true or false
            enabled : true,
            
            // true or false.  Only meaningful if active is true.  Defaults to true if not set.
            active  : true,

            // Last accessed/modified in milliseconds since the epoch.  Only meaningful if enabled is true and active is false.
            // If enabled is true and active is false and this value is more than the number of days in the past identified by the PLM,
            // this is a reaping candidate.  If enabled is true and active is false and this is not set, this is an immediate reaping candidate.
            last_active : new Date().getTime()
        };

        console.log("State GET result: %j", result);

        response.json(200, result);
    }
    catch(exception)
    {
        console.log(exception);
    }
};


var garbage_scan = function(req, res){

	/*
	var url = req.body.url;
	var encoding = req.body.encoding;
	if (typeof encoding === 'undefined'){
		encoding = 'UTF-8';
	}
	
	var data = util.format('%s,%s', url, encoding);

	console.log(data);
	//var data = 'http://emergtech.mybluemix.net/test/garbledUTF8-2.html,UTF-8';
	*/

	data = JSON.stringify(req.body);

	var options = {  
		//host: 'emergtech.mybluemix.net',//主机：切记不可在前面加上HTTP://  
		host: 'garbagecodedetection.mybluemix.net',
	    port: 80,//端口号  
	    path: '/rest/garbagechar_scan',//路径  
	    method: 'POST',//提交方式   
	};

	var request = http.request(options, function(serverFeedback) {
		if (serverFeedback.statusCode == 200){
			var body = "";
			serverFeedback.on('data', function(data){
				body += data;
			}).on('end', function(){
				res.send(200, body);
			});
		} else {
			res.send(500, "Error");
		}
	});

	request.write(data);
	request.end();

}


var expressServer = express();

expressServer.configure(configure);

// Get for testing.  Not authenticated
expressServer.get("/", get);

// Authorization
var basicAuth = express.basicAuth(SERVICE_BROKER_USER, SERVICE_BROKER_PASSWORD);

var expressServer = express();

expressServer.configure(configure);

// Get for testing.  Not authenticated
expressServer.get("/", get);

// Authorization
var basicAuth = express.basicAuth(SERVICE_BROKER_USER, SERVICE_BROKER_PASSWORD);

// The following URL paths are all mandated by CloudFoundry
expressServer.get("/v2/catalog", basicAuth, catalog);
expressServer.put("/v2/service_instances/:instance_id", basicAuth, provision);
expressServer.put("/v2/service_instances/:instance_id/service_bindings/:binding_id", basicAuth, bind);
expressServer.del("/v2/service_instances/:instance_id/service_bindings/:binding_id", basicAuth, unbind);
expressServer.del("/v2/service_instances/:instance_id", basicAuth, unprovision);
expressServer.patch("/v2/service_instances/:instance_id", basicAuth, update);

expressServer.post("/garbage_scan", basicAuth, garbage_scan)

// Paths to handle SSO - not authenticated
expressServer.get("/dashboard/:instance_id", dashboard);
expressServer.get("/sso_dashboard", sso_dashboard);

// IBM BlueMix Enablement Extensions
expressServer.put("/bluemix_v1/service_instances/:instance_id", basicAuth, enable);
expressServer.get("/bluemix_v1/service_instances/:instance_id", basicAuth, state);

/*
https.createServer(options,
*/ 

// If Cloud Foundry
if (process.env.VCAP_APP_HOST && process.env.VCAP_APP_PORT)
{
    expressServer.listen(process.env.VCAP_APP_PORT,
                         process.env.VCAP_APP_HOST,
                         connected);
}
// Else - Local
else
{
    expressServer.listen(PORT,
                         connected);
}
