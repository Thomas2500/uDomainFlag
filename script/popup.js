/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

const getCurrentTab = function (callback) {
	chrome.tabs.query({
		windowId: chrome.windows.WINDOW_ID_CURRENT,
		active: true
	}, function (tabs) {
		callback(tabs[0]);
		df.processLastError();
	});
};

getCurrentTab(function (data) {
	// get current URL which may contain additional data, e.g. popup.html#ip=185.128.246.155&a=b
	let url = new URL(window.location.href);
	let metadata = {};
	url = url.hash.replace("#", "");
	url.split("&").forEach(function (item) {
		metadata[item.split("=")[0]] = item.split("=")[1]
	});

	// fetch current data from server
	df.callbackLookup('resolve', { url: data.url, meta: metadata }, function (responseLookupData) {
		console.log(responseLookupData);

		if (responseLookupData === null || responseLookupData.success === false || responseLookupData.success == "false") {
			// data can't be fetched
			document.querySelector('.ip a').textContent = "unknown";
			document.querySelector('.ip').classList.remove("loader");
			document.querySelector('.host').textContent = "unknown";
			document.querySelector('.host').classList.remove("loader");
			return;
		}

		// try to determine local used ip
		// if not available fallback to first IP from remote,
		let hasWrittenIP = false;
		if (typeof metadata.ip !== "undefined" && metadata.ip != "") {
			// determine if IP is not included in responseLookupData.ips
			let found = false;
			let hostname = "";
			responseLookupData.ips.forEach(function (singleItem) {
				if (singleItem.ip == metadata.ip) {
					found = true;
					hostname = singleItem.hostname;
				}
			});

			if (found) {
				document.querySelector('.ip a').textContent = metadata.ip;
				// remove ending dot from hostname
				if (hostname.endsWith(".")) {
					hostname = hostname.substring(0, hostname.length - 1);
				}
				if (hostname != "") {
					document.querySelector('.host').textContent = hostname;
				} else {
					document.querySelector('.host').textContent = "N/A";
				}
				document.querySelector('.ip').classList.remove("loader");
				document.querySelector('.host').classList.remove("loader");
				hasWrittenIP = true;
			}
		}

		if (!hasWrittenIP && responseLookupData.ips.length >= 1) {
			// always prefer IPv4 - check if IPv4 address is available and when yes show it as primary
			let hasIPv4 = false;
			responseLookupData.ips.forEach(function (singleItem) {
				if (singleItem.ip.indexOf(":") == -1) {
					hasIPv4 = true;
					document.querySelector('.ip a').textContent = singleItem.ip;
					// remove ending dot from hostname
					if (singleItem.hostname.substring(singleItem.hostname.length - 1) == ".") {
						singleItem.hostname = singleItem.hostname.substring(0, singleItem.hostname.length - 1);
					}
					document.querySelector('.host').textContent = singleItem.hostname;
				}
			});

			if (!hasIPv4) {
				document.querySelector('.ip a').textContent = responseLookupData.ips[0].ip;
				// remove ending dot from hostname
				if (responseLookupData.ips[0].hostname.substring(responseLookupData.ips[0].hostname.length - 1) == ".") {
					responseLookupData.ips[0].hostname = responseLookupData.ips[0].hostname.substring(0, responseLookupData.ips[0].hostname.length - 1);
				}
				if (responseLookupData.ips[0].hostname != "") {
					document.querySelector('.host').textContent = responseLookupData.ips[0].hostname;
				} else {
					document.querySelector('.host').textContent = "N/A";
				}
			}

			document.querySelector('.ip').classList.remove("loader");
			document.querySelector('.host').classList.remove("loader");
		} else if (!hasWrittenIP) {
			// sorry, nothing to display
			document.querySelector('.ip a').textContent = "unknown";
			document.querySelector('.ip').classList.remove("loader");
			document.querySelector('.host').textContent = "unknown";
			document.querySelector('.host').classList.remove("loader");
		}

		// create list of all IPs
		if (responseLookupData.ips.length > 1) {
			responseLookupData.ips.forEach(function (value) {
				// skip already displayed records
				if (value.ip != document.querySelector('.ip a').textContent) {
					let ipfield = document.createElement('div');
					ipfield.classList.add('title');
					ipfield.textContent = 'IP';
					let ipValueField = document.createElement('div');
					ipValueField.classList.add('content');
					ipValueField.textContent = value.ip;
					if (value.hostname.substring(value.hostname.length - 1) == ".") {
						value.hostname = value.hostname.substring(0, value.hostname.length - 1);
					}
					ipValueField.setAttribute('title', value.hostname);
					let mainObject = document.createElement('div');
					mainObject.classList.add('line');
					mainObject.appendChild(ipfield);
					mainObject.appendChild(ipValueField);
					document.querySelector('.multiip .content').appendChild(mainObject);
				}
			});
			document.querySelector('.multiip').style.display = "block";
			document.querySelector('.multiip .clickable').addEventListener("click", function () {
				if (document.querySelector('.multiip .content').style.display == "none") {
					document.querySelector('.multiip .content').style.display = "block";
				} else {
					document.querySelector('.multiip .content').style.display = "none";
				}
			});
		}

		// if .ip has a value, set hyperlink to lookup page
		if (document.querySelector('.ip a').textContent != "unknown" && document.querySelector('.ip a').textContent != "") {
			document.querySelector('.ip a').href = lookup_protocol + '://' + lookup_domain + '/ip/' + document.querySelector('.ip').textContent;
		}
	});
	df.callbackLookup('location', { url: data.url, meta: metadata }, function (responseLookupData) {
		console.log(responseLookupData);
		if (responseLookupData === null || responseLookupData.success === false || responseLookupData.success == "false") {
			// data can't be fetched. display error page
			//window.location.href = "error.html";
			return;
		}

		document.querySelector('.infolink a').href = lookup_protocol + '://' + lookup_domain + '/ip/' + responseLookupData.query;
		document.querySelector('.text-more').textContent = _("more_info");

		document.querySelector('.country').textContent = responseLookupData.country;

		let tx = "";
		if (responseLookupData.region != "") {
			tx = responseLookupData.region;
		}
		if (responseLookupData.city != "") {
			if (tx == "") {
				tx = responseLookupData.city;
			} else {
				tx += ", " + responseLookupData.city;
			}
		}
		document.querySelector('.country2').textContent = tx;
	});
	df.callbackLookup('asn', { url: data.url, meta: metadata }, function (response) {
		console.log(response);
		if (response === null || response.success === false || response.success == "false") {
			// data can't be fetched. display error page
			document.querySelector('.asn a').textContent = "unknown";
			document.querySelector('.asn').classList.remove("loader");
			document.querySelector('.isp').textContent = "unknown";
			document.querySelector('.isp').classList.remove("loader");
			return;
		}

		document.querySelector('.asn a').textContent = "AS" + response.asn;
		document.querySelector('.asn a').href = lookup_protocol + '://' + lookup_domain + '/asn/' + response.asn;
		document.querySelector('.asn').classList.remove("loader");
		document.querySelector('.isp').textContent = response.description;
		document.querySelector('.isp').classList.remove("loader");
	});
});
