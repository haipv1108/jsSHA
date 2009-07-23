/* A JavaScript implementation of the SHA family of hashes, as defined in FIPS PUB 180-2
 * as well as the corresponding HMAC implementation as defined in FIPS PUB 198a
 * Version 1.2 Copyright Brian Turek 2009
 * Distributed under the BSD License
 * See http://jssha.sourceforge.net/ for more information
 *
 * Several functions taken from Paul Johnson
 */

function jsSHA(srcString, inputFormat) {

	jsSHA.charSize = 8;
	jsSHA.b64pad  = "";
	jsSHA.hexCase = 0;

	var sha224 = null;
	var sha256 = null;

	var str2binb = function (str) {
		var bin = [];
		var mask = (1 << jsSHA.charSize) - 1;
		var length = str.length * jsSHA.charSize;

		for (var i = 0; i < length; i += jsSHA.charSize) {
			bin[i >> 5] |= (str.charCodeAt(i / jsSHA.charSize) & mask) << (32 - jsSHA.charSize - i % 32);
		}

		return bin;
	};
	
	var hex2binb = function (str) {
		var bin = [];
		var length = str.length;

		for (var i = 0; i < length; i += 2) {
			var num = parseInt(str.substr(i, 2), 16);
			if (!isNaN(num)) {
				bin[i >> 3] |= num << (24 - (4 * (i % 8)));
			} else {
				return "INVALID HEX STRING";
			}
		}

		return bin;
	};

	var strBinLen = null;
	var strToHash = null;

	if ("HEX" === inputFormat) {
		if (0 !== (srcString.length % 2)) {
			return "TEXT MUST BE IN BYTE INCREMENTS";
		}
		strBinLen = srcString.length * 4;
		strToHash = hex2binb(srcString);
	} else if (("ASCII" === inputFormat) ||
		('undefined' === typeof(inputFormat))) {
		strBinLen = srcString.length * jsSHA.charSize;
		strToHash = str2binb(srcString);
	} else {
		return "UNKNOWN TEXT INPUT TYPE";
	}

	var binb2hex = function (binarray) {
		var hex_tab = jsSHA.hexCase ? "0123456789ABCDEF" : "0123456789abcdef";
		var str = "";
		var length = binarray.length * 4;

		for (var i = 0; i < length; i++) {
			str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) + hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
		}

		return str;
	};

	var binb2b64 = function (binarray) {
		var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var str = "";
		var length = binarray.length * 4;
		for (var i = 0; i < length; i += 3)
		{
			var triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
			for (var j = 0; j < 4; j++) {
				if (i * 8 + j * 6 > binarray.length * 32) {
					str += jsSHA.b64pad;
				} else {
					str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
				}
			}
		}
		return str;
	};

	var rotr = function (x, n) {
		if (n < 32) {
			return (x >>> n) | (x << (32 - n));
		} else {
			return x;
		}
	};

	var shr = function (x, n) {
		if (n < 32) {
			return x >>> n;
		} else {
			return 0;
		}
	};

	var ch = function (x, y, z) {
		return (x & y) ^ (~x & z);
	};

	var maj = function (x, y, z) {
		return (x & y) ^ (x & z) ^ (y & z);
	};

	var sigma0 = function (x) {
		return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
	};

	var sigma1 = function (x) {
		return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
	};

	var gamma0 = function (x) {
		return rotr(x, 7) ^ rotr(x, 18) ^ shr(x, 3);
	};

	var gamma1 = function (x) {
		return rotr(x, 17) ^ rotr(x, 19) ^ shr(x, 10);
	};

	var safeAdd_2 = function (x, y) {
		var lsw = (x & 0xFFFF) + (y & 0xFFFF);
		var msw = (x >>> 16) + (y >>> 16) + (lsw >>> 16);

		return ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
	};
	
	var safeAdd_4 = function (a, b, c, d) {
		var lsw = (a & 0xFFFF) + (b & 0xFFFF) + (c & 0xFFFF) + (d & 0xFFFF);
		var msw = (a >>> 16) + (b >>> 16) + (c >>> 16) + (d >>> 16) + (lsw >>> 16);

		return ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
	};

	var safeAdd_5 = function (a, b, c, d, e) {
		var lsw = (a & 0xFFFF) + (b & 0xFFFF) + (c & 0xFFFF) + (d & 0xFFFF) +
			(e & 0xFFFF);
		var msw = (a >>> 16) + (b >>> 16) + (c >>> 16) + (d >>> 16) +
			(e >>> 16) + (lsw >>> 16);

		return ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
	};
	
	var coreSHA2 = function (message, messageLen, variant) {
		var W = [];
		var a, b, c, d, e, f, g, h;
		var T1, T2;
		var H;
		var K = [
				0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
				0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
				0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
				0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
				0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
				0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
				0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
				0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
				0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
				0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
				0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
				0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
				0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
				0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
				0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
				0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
			];

		if (variant === "SHA-224") {
			H = [
					0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
					0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
				];
		} else {
			H = [
					0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
					0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
				];
		}

		message[messageLen >> 5] |= 0x80 << (24 - messageLen % 32);
		message[((messageLen + 1 + 64 >> 9) << 4) + 15] = messageLen;

		var appendedMessageLength = message.length;

		for (var i = 0; i < appendedMessageLength; i += 16) {
			a = H[0];
			b = H[1];
			c = H[2];
			d = H[3];
			e = H[4];
			f = H[5];
			g = H[6];
			h = H[7];

			for (var t = 0; t < 64; t++) {
				if (t < 16) {
					W[t] = message[t + i];
				} else {
					W[t] = safeAdd_4(gamma1(W[t - 2]), W[t - 7], gamma0(W[t - 15]), W[t - 16]);
				}

				T1 = safeAdd_5(h, sigma1(e), ch(e, f, g), K[t], W[t]);
				T2 = safeAdd_2(sigma0(a), maj(a, b, c));
				h = g;
				g = f;
				f = e;
				e = safeAdd_2(d, T1);
				d = c;
				c = b;
				b = a;
				a = safeAdd_2(T1, T2);
			}

			H[0] = safeAdd_2(a, H[0]);
			H[1] = safeAdd_2(b, H[1]);
			H[2] = safeAdd_2(c, H[2]);
			H[3] = safeAdd_2(d, H[3]);
			H[4] = safeAdd_2(e, H[4]);
			H[5] = safeAdd_2(f, H[5]);
			H[6] = safeAdd_2(g, H[6]);
			H[7] = safeAdd_2(h, H[7]);
		}

		switch (variant) {
		case "SHA-224":
			return	[
				H[0], H[1],	H[2], H[3],
				H[4], H[5],	H[6]
			];
		case "SHA-256":
			return H;
		default:
			return [];
		}
	};

	this.getHash = function (variant, format) {
		var formatFunc = null;
		var message = strToHash.slice();

		switch (format) {
		case "HEX":
			formatFunc = binb2hex;
			break;
		case "B64":
			formatFunc = binb2b64;
			break;
		default:
			return "FORMAT NOT RECOGNIZED";
		}

		switch (variant) {
		case "SHA-224":
			if (sha224 === null) {
				sha224 = coreSHA2(message, strBinLen, variant);
			}
			return formatFunc(sha224);
		case "SHA-256":
			if (sha256 === null) {
				sha256 = coreSHA2(message, strBinLen, variant);
			}
			return formatFunc(sha256);
		default:
			return "HASH NOT RECOGNIZED";
		}
	};
	
	this.getHMAC = function (key, inputFormat, variant, outputFormat) {
		var formatFunc = null;
		var keyToUse = null;
		var keyWithIPad = [];
		var keyWithOPad = [];
		var retVal = null;
		var keyBinLen = null;
		var hashBitSize = null;

		switch (outputFormat) {
		case "HEX":
			formatFunc = binb2hex;
			break;
		case "B64":
			formatFunc = binb2b64;
			break;
		default:
			return "FORMAT NOT RECOGNIZED";
		}

		switch (variant) {
		case "SHA-224":
			hashBitSize = 224;
			break;
		case "SHA-256":
			hashBitSize = 256;
			break;
		default:
			return "HASH NOT RECOGNIZED";
		}

		if ("HEX" === inputFormat) {
			if (0 !== (key.length % 2)) {
				return "KEY MUST BE IN BYTE INCREMENTS";
			}
			keyToUse = hex2binb(key);
			keyBinLen = key.length * 4;
		} else if ("ASCII" === inputFormat) {
			keyToUse = str2binb(key);
			keyBinLen = key.length * jsSHA.charSize;
		} else {
			return "UNKNOWN KEY INPUT TYPE";
		}

		if (512 < keyBinLen) {
			keyToUse = coreSHA2(keyToUse, keyBinLen, variant);
			keyToUse[15] &= 0xFFFFFF00;
		} else if (512 > keyBinLen) {
			keyToUse[15] &= 0xFFFFFF00;
		}

		for (var i = 0; i <= 15; i++) {
			keyWithIPad[i] = keyToUse[i] ^ 0x36363636;
			keyWithOPad[i] = keyToUse[i] ^ 0x5C5C5C5C;
		}

		retVal = coreSHA2(keyWithIPad.concat(strToHash), 512 + strBinLen, variant);
		retVal = coreSHA2(keyWithOPad.concat(retVal), 512 + hashBitSize, variant);

		return (formatFunc(retVal));
	};
}
