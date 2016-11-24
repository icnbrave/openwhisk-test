package com.ibm.gssc.et;

import java.util.ArrayList;

public class ScanResult {
	private String url;
	private boolean garbagechar_found;
	private String doc_charset;
	private ArrayList<String> garbled_lines = new ArrayList<String>();
	private String errMsg;
	public String getUrl() {
		return url;
	}
	public void setUrl(String url) {
		this.url = url;
	}
	public boolean isGarbagechar_found() {
		return garbagechar_found;
	}
	public void setGarbagechar_found(boolean garbagechar_found) {
		this.garbagechar_found = garbagechar_found;
	}
	public String getDoc_charset() {
		return doc_charset;
	}
	public void setDoc_charset(String doc_charset) {
		this.doc_charset = doc_charset;
	}
	public ArrayList<String> getGarbled_lines() {
		return garbled_lines;
	}
	public void setGarbled_lines(ArrayList<String> garbled_lines) {
		this.garbled_lines = garbled_lines;
	}
	public String getErrMsg() {
		return errMsg;
	}
	public void setErrMsg(String errMsg) {
		this.errMsg = errMsg;
	}
}
