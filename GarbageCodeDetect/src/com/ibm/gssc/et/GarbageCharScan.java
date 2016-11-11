package com.ibm.gssc.et;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLConnection;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

public class GarbageCharScan {

	private String doc_charset;
	private String url;

	public GarbageCharScan(String url) {
		this.url = url;
	}

	public GarbageCharScan(String url, String doc_charset) {
		this.url = url;
		this.doc_charset = doc_charset;
	}

	public ArrayList<String> getGarbageChars() throws Exception {
		ArrayList<String> garbledLines = new ArrayList<String>();
		if (this.doc_charset == null || this.doc_charset.isEmpty()) {
			Document doc = Jsoup.connect(url).get();
			String charset = doc.charset().name();
			if (charset != null && !charset.isEmpty()) {
				this.doc_charset = charset;
			} else {
				this.doc_charset = "UTF-8";
			}
		}

		System.out.println("Doc charset: " + this.doc_charset);

		byte[] bytes = Jsoup.connect(url).execute().bodyAsBytes();

		// Charset.availableCharsets().get(charset).newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
		CharsetDecoder decoder = Charset.availableCharsets().get(this.doc_charset).newDecoder();
		// Replace with REPLACEMENT CHARACTER FFFD if invalid encoded
		// char found"
		decoder.onMalformedInput(CodingErrorAction.REPLACE).onUnmappableCharacter(CodingErrorAction.REPLACE)
				.replaceWith("\uFFFD");

		String lines[] = decoder.decode(ByteBuffer.wrap(bytes)).toString().split("\\r?\\n");
		for (String line : lines) {
			Pattern pattern = Pattern.compile("\uFFFD");
			Matcher matcher = pattern.matcher(line);
			if (matcher.find()) {
				Document html_doc = Jsoup.parse(line);
				Elements elements = html_doc.body().select("*");
				for (Element element : elements) {
					if (element.ownText() != null && !element.ownText().isEmpty()) {
						String val = element.ownText();
						if (val != null && !val.isEmpty()) {
							garbledLines.add(val);
							System.out.println(val);
						}
					}
				}
			}
		}
		return garbledLines;
	}

	public ArrayList<String> isContainGarbageChar_line() {
		ArrayList<String> garbledLines = new ArrayList<String>();
		try {
			Document doc = Jsoup.connect(url).get();
			String charset = doc.charset().name();
			System.out.println("Doc charset: " + charset);

			URLConnection connection = new URL(url).openConnection();
			InputStream inStream = connection.getInputStream();
			for (String line : org.apache.commons.io.IOUtils.readLines(inStream, charset)) {
				// String htmlText =
				// org.apache.commons.io.IOUtils.toString(inStream,
				// StandardCharsets.ISO_8859_1);
				if (line != null && !line.isEmpty()) {
					// bytes = line.getBytes(charset);
					// System.out.println(javax.xml.bind.DatatypeConverter.printHexBinary(bytes));
					if (isContainUTF8ReplacementChar(line)) {
						// String utf8str = new String(bytes,
						// StandardCharsets.UTF_8);
						// String html = "<div><p>Lorem ipsum.</p>";
						// Document doc = Jsoup.parseBodyFragment(html)
						garbledLines.add(line);
					}
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return garbledLines;
	}

	public ArrayList<String> isContainGarbageChar_element() {
		ArrayList<String> garbledValues = new ArrayList<String>();
		try {
			Document doc = Jsoup.connect(url).get();
			String charset = doc.charset().name();
			if (charset != null && !charset.isEmpty()) {
				this.doc_charset = charset;
			}
			System.out.println("Doc charset: " + this.doc_charset);

			Document doc2 = Jsoup.parse(new URL(url).openStream(), charset, url);
			Elements elements = doc2.body().select("*");
			for (Element element : elements) {
				if (element.ownText() != null && !element.ownText().isEmpty()) {
					String val = element.ownText();
					if (val != null && !val.isEmpty()) {
						// byte[] bytes = val.getBytes(charset);
						if ("UTF-8".equalsIgnoreCase(this.doc_charset)) {
							if (isContainUTF8ReplacementChar(val)) {
								garbledValues.add(val);
							}
						}
					}
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return garbledValues;
	}

	public static boolean isContainUTF8ReplacementChar(String utf8str) {
		// search for any unicode REPLACEMENT CHARACTER FFFD"
		Pattern pattern = Pattern.compile("\uFFFD");
		Matcher matcher = pattern.matcher(utf8str);
		if (matcher.find()) {
			// System.out.println("REPLACEMENT char found");
			return true;
		}
		return false;
	}

	public static void main(String[] args) {
		try {
			// String url =
			// "http://localhost:9080/EmergTech/test/goodUTF8.html";
			// String url =
			// "http://localhost:9080/EmergTech/test/garbledUTF8.html";
			// String url =
			// "http://localhost:9080/EmergTech/test/goodBig5.html";
			String url = "http://localhost:9080/EmergTech/test/garblessdBig5.html";
			GarbageCharScan garbageCharDetect = new GarbageCharScan(url);

			System.out.println("Method 1: Read the html page into as byte array using jsoup");
			garbageCharDetect.getGarbageChars();

			// System.out.println("Method 2: Read html page as InputStream and
			// parse
			// the content line by line");
			// for (String garbled :
			// garbageCharDetect.isContainGarbageChar_lines(url)) {
			// System.out.println(garbled);
			// }

			// System.out.println("Method 3: Parse html page and get element
			// text
			// using jsoup");
			// for (String garbled :
			// garbageCharDetect.isContainGarbageChar_element()) {
			// System.out.println(garbled);
			// }
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public String getDoc_charset() {
		return doc_charset;
	}

	public void setDoc_charset(String doc_charset) {
		this.doc_charset = doc_charset;
	}

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}

	public static void test1() {
		try {
			File fileDir = new File("C:/E_Drive/Projects/GSSC/Workgroup/workspace/EmergTech/WebContent/test");
			BufferedReader in = new BufferedReader(new InputStreamReader(new FileInputStream(fileDir), "UTF8"));
			String str;
			while ((str = in.readLine()) != null) {
				try {
					byte[] bytes = str.getBytes("UTF-8");
					// if (!isValidUTF8(bytes))
					// System.out.println("not valid:" + str);
					// else
					// System.out.println(new String(bytes, "UTF-8"));
				} catch (UnsupportedEncodingException e) {
					// Impossible, throw unchecked
					throw new IllegalStateException("No Latin1 or UTF-8: " + e.getMessage());
				}
			}
			in.close();
		} catch (UnsupportedEncodingException e) {
			System.out.println(e.getMessage());
		} catch (IOException e) {
			System.out.println(e.getMessage());
		} catch (Exception e) {
			System.out.println(e.getMessage());
		}
	}

	public static void test2() {
		try {
			byte[] bytes = new byte[] { (byte) 0xe8, (byte) 0xb2, (byte) 0xbb };
			String utf8str = new String(bytes, StandardCharsets.UTF_8);
			String decodeStr = Charset.availableCharsets().get("UTF-8").newDecoder().decode(ByteBuffer.wrap(bytes))
					.toString();
			System.out.println(javax.xml.bind.DatatypeConverter.printHexBinary(bytes) + ":" + utf8str);
			System.out
					.println(javax.xml.bind.DatatypeConverter.printHexBinary(utf8str.getBytes(StandardCharsets.UTF_8)));
			System.out.println("decodeStr:" + decodeStr);
			// String utf8String = new String(big5String.getBytes("big5"),
			// "UTF-8");
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}
