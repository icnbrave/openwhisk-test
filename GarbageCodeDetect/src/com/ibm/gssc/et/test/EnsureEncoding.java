package com.ibm.gssc.et.test;

import static java.nio.charset.StandardCharsets.ISO_8859_1;
import static java.nio.charset.StandardCharsets.UTF_16BE;
import static java.nio.charset.StandardCharsets.UTF_16LE;
import static java.nio.charset.StandardCharsets.UTF_8;

import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.util.Arrays;

/**
 * Helper that takes a byte[] of chars and tries to guess the encoding
 * 
 * @author Markus Merzinger, Lingohub
 */
public class EnsureEncoding {
  public static final Charset[] TRY_ENC_UTF8_ISO88591_UTF16LE_UTF16BE = new Charset[] { UTF_8, ISO_8859_1, UTF_16LE, UTF_16BE };
  public static final Charset[] TRY_ENC_UTF16LE_UTF16BE_UTF8_ISO88591 = new Charset[] { UTF_16LE, UTF_16BE, UTF_8,
      ISO_8859_1 };

  private final Charset[] encodingsToTry;

  /**
   * constructs with a set of encodings that works fine in most cases
   */
  public EnsureEncoding() {
    this(TRY_ENC_UTF8_ISO88591_UTF16LE_UTF16BE);
  }

  /**
   * @param encodingsToTry
   *          a set of charsets to be passed if the default ENCODINGS_TO_TRY does not give the expected results
   */
  public EnsureEncoding(Charset[] encodingsToTry) {
    this.encodingsToTry = encodingsToTry;
  }

  /**
   * will try to convert the given chars to a valid string.
   * no additional content check will be done
   * 
   * @param chars
   *          characters in an unknown charset
   * @return the chars converted to a String decoded by the first matching {@link Charset}
   * @throws Exception
   *           if converting the chars to a String was not possible
   */
  public String decode(byte[] chars) throws Exception {
    return decode(chars, new NoContentCheck());
  }

  /**
   * will try to convert the given chars to a valid string.
   * will check for every valid conversion if the converted String contains 'hasToContain' as additional check, if not
   * it will continue with the next encoding
   * 
   * @param chars
   *          characters in an unknown charset
   * @param hasToContain
   *          checks if the converted String contains this value
   * @return the chars converted to a String decoded by the first matching {@link Charset}
   * @throws Exception
   *           if converting the chars to a String was not possible
   */
  public String decode(byte[] chars, String hasToContain) throws Exception {
    return decode(chars, new ContainsStringContentCheck(hasToContain));
  }

  /**
   * will try to convert the given chars to a valid string.
   * will check for every valid conversion if the given {@link ContentCheck} is valid, if not
   * it will continue with the next encoding
   * 
   * @param chars
   *          characters in an unknown charset
   * @param check
   *          this instance will be called for every valid conversion
   * @return the chars converted to a String decoded by the first matching {@link Charset}
   * @throws Exception
   *           if converting the chars to a String was not possible
   */
  public String decode(byte[] chars, ContentCheck check) throws Exception {
    for (Charset encodingToTry : encodingsToTry) {
      try {
        String content = decode(chars, encodingToTry);

        if (check.isValidContent(content)) {
          return content;
        }
      } catch (CharacterCodingException e) {
        // try with next encoding
      }
    }
    throw new IllegalStateException("was not able to encode string using these encodings"
        + Arrays.toString(encodingsToTry));
  }

  protected String decode(byte[] chars, Charset encodingToTry) throws CharacterCodingException {
    CharsetDecoder decoder = encodingToTry.newDecoder().onMalformedInput(CodingErrorAction.REPORT);

    ByteBuffer byteBuffer = ByteBuffer.wrap(chars);
    CharBuffer decoded = decoder.decode(byteBuffer);

    return decoded.toString();
  }

  public interface ContentCheck {
    /**
     * @param content
     *          additionally checks this String for validity
     * @return true if the given content is valid
     */
    boolean isValidContent(String content);
  }

  public static class NoContentCheck implements ContentCheck {
    @Override
    public boolean isValidContent(String content) {
      return true;
    }
  }

  private static class ContainsStringContentCheck implements ContentCheck {
    final String stringToCheck;

    public ContainsStringContentCheck(final String stringToCheck) {
      this.stringToCheck = stringToCheck;
    }

    @Override
    public boolean isValidContent(String content) {
      return content.contains(stringToCheck);
    }
  }
}
