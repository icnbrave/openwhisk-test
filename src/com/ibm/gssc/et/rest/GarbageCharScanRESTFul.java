package com.ibm.gssc.et.rest;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;

import javax.ws.rs.POST;
import javax.ws.rs.Path;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.google.gson.Gson;
import com.ibm.gssc.et.GarbageCharScan;
import com.ibm.gssc.et.ScanResult;

@Path("/garbagechar_scan")
public class GarbageCharScanRESTFul {
	@POST
	public String garbageChaScan(String input) {

		ArrayList<ScanResult> results = new ArrayList<ScanResult>();
		try {
			JSONArray jsonURLData = new JSONArray(input);
			System.out.println(input);

			for (int i = 0; i < jsonURLData.length(); i++) {
				ScanResult result = new ScanResult();
				GarbageCharScan garbageCharDetect = null;
				try {
					JSONObject item = jsonURLData.getJSONObject(i);
					String url = item.getString("url");
					result.setUrl(url);
					if (item.has("encoding"))
						garbageCharDetect = new GarbageCharScan(url, item.getString("encoding"));
					else
						garbageCharDetect = new GarbageCharScan(url);

					ArrayList<String> scanResultLines = null;

					scanResultLines = garbageCharDetect.getGarbageChars();
					if (scanResultLines != null && !scanResultLines.isEmpty()) {
						result.setGarbagechar_found(true);
						result.setGarbled_lines(scanResultLines);
					} else {
						result.setGarbagechar_found(false);
					}
				} catch (Exception e) {
					StringWriter writer = new StringWriter();
					e.printStackTrace(new PrintWriter(writer));
					String[] lines = writer.toString().split("\n");
					if (lines != null && lines.length > 0) {
						result.setErrMsg(lines[0]);
					} else {
						result.setErrMsg(e.getMessage());
					}
				}
				result.setDoc_charset(garbageCharDetect.getDoc_charset());
				results.add(result);
			}
		} catch (JSONException e) {
			ScanResult result = new ScanResult();
			result.setErrMsg(e.getMessage());
			results.add(result);
		}
		Gson gson = new Gson();
		return gson.toJson(results);
	}
}

// @GET
// @Path("/{name}")
// public String sayHello(@PathParam("name") String name) {
// return "Hello, " + name;
// }
