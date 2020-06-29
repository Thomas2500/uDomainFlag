/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

var getCurrentTab = function (callback) {
	chrome.tabs.query({
		windowId: chrome.windows.WINDOW_ID_CURRENT,
		active: true
	}, function (tabs) {
		callback(tabs[0]);
	});
};

getCurrentTab(function (data) {
	chrome.runtime.sendMessage({ type: "popup", url: data.url }, function (response) {
		if (response !== null) {
			insertLookupResponseData(response);
		} else {

			// parse url to a domain
			let domain = df.parseUrl(data.url);

			// requested url is not special and not in cache, request data from server
			let request = new XMLHttpRequest();
			request.open('GET', api_protocol + '://' + api_domain + api_path + '/lookup/' + domain, true);

			request.onload = function () {
				if (this.status == 200) {
					let parsedData;
					try {
						parsedData = JSON.parse(this.response);
					}
					catch (e) {
						let status = this.status;
						let response = this.response;
						Sentry.withScope(function (scope) {
							scope.setExtra("domain", domain);
							scope.setExtra("status", status);
							scope.setExtra("response", response);
							Sentry.captureException(e);
						});
					}
					insertLookupResponseData(parsedData);
				} else {
					// Something went wrong contacting the server
					let status = this.status;
					let response = this.response;
					Sentry.withScope(function (scope) {
						scope.setExtra("domain", domain);
						scope.setExtra("status", status);
						scope.setExtra("response", response);
						Sentry.captureMessage("error requesting data from server");
					});
					// TODO: error symbol
					return;
				}
			};

			request.onerror = function () {
				// There was a connection error of some sort
				// this is nothing we should report because we do not have error data
				// or can do anything about it. mostly connection issues from the user
				// TODO: error symbol
			};

			request.send();

		}
	});
});

function insertLookupResponseData(responseLookupData){
	if (responseLookupData.success == false) {
		// data can't be fetched. display error page

		return;
	}
	document.querySelector('.infolink a').href = lookup_protocol + '://' + lookup_domain + '/l/' + responseLookupData.query;
	document.querySelector('.text-more').textContent = _("more_info");

	// try to determine local used ip
	// if not available fallback to first IP from remote
	// because of the parser we have to ass "https://" to the url
	chrome.runtime.sendMessage({ type: "resolved", url: "https://" + responseLookupData.query }, function (response) {
		if (response !== null) {
			document.querySelector('.ip').textContent = response;
			document.querySelector('.ip').classList.remove("loader");
		} else {
			// fallback to IP which was used for geo lookup
			if (responseLookupData.location.ip != "") {
				document.querySelector('.ip').textContent = responseLookupData.location.ip;
				document.querySelector('.ip').classList.remove("loader");
			} else {
				// sorry, nothing to display
				document.querySelector('.ip').textContent = "unknown";
				document.querySelector('.ip').classList.remove("loader");
			}
		}

		// try to determine hostname based on IP
		if (document.querySelector('.ip').textContent != "unknown" && document.querySelector('.ip').textContent != "") {
			responseLookupData.ips.forEach(function(singleItem){
				if (singleItem.ip == document.querySelector('.ip').textContent) {
					document.querySelector('.host').textContent = singleItem.hostname;
					document.querySelector('.host').classList.remove("loader");
				}
			});
		}
		// TODO: nothing found, make new request to lookup hostname of IP

		// nothing found, assume IP as hostname
		if (document.querySelector('.host').textContent == "") {
			// requested url is not special and not in cache, request data from server
			let request = new XMLHttpRequest();
			request.open('GET', api_protocol + '://' + api_domain + api_path + '/lookup/' + document.querySelector('.ip').textContent, true);

			request.onload = function () {
				if (this.status != 200) {
					document.querySelector('.host').textContent = "unknown";
					document.querySelector('.host').classList.remove("loader");
					return;
				}

				let parsedData;
				try {
					parsedData = JSON.parse(this.response);
				}
				catch (e) {
					let status = this.status;
					let response = this.response;
					Sentry.withScope(function (scope) {
						scope.setExtra("domain", domain);
						scope.setExtra("status", status);
						scope.setExtra("response", response);
						Sentry.captureException(e);
					});
				}
				if (parsedData.ips.length >= 1) {
					document.querySelector('.multiip').style.display = "block";
					document.querySelector('.host').textContent = parsedData.ips[0].hostname;
				} else {
					document.querySelector('.host').textContent = "unknown";
				}
				document.querySelector('.host').classList.remove("loader");
			};
			request.onerror = function () {
				document.querySelector('.host').textContent = "unknown";
				document.querySelector('.host').classList.remove("loader");
			};
			request.send();
		}
	});

	document.querySelector('.country').textContent = responseLookupData.location.country;

	let tx = "";
	if (responseLookupData.location.region != "") {
		tx = responseLookupData.location.region;
	}
	if (responseLookupData.location.city != "") {
		if (tx == "") {
			tx = responseLookupData.location.city;
		} else {
			tx += ", " + responseLookupData.location.city;
		}
	}
	document.querySelector('.country2').textContent = tx;

	document.querySelector('.asn').textContent = "AS" + responseLookupData.isp.asn;
	document.querySelector('.asn').classList.remove("loader");
	document.querySelector('.isp').textContent = responseLookupData.isp.description;
	document.querySelector('.isp').classList.remove("loader");

	if (responseLookupData.ips.length > 1) {
		responseLookupData.ips.forEach(function(value){
			// skip already displayed records
			if (value.ip != document.querySelector('.ip').textContent) {
				let ipfield = document.createElement('div');
				ipfield.classList.add('title');
				ipfield.textContent = 'IP';
				let ipValueField = document.createElement('div');
				ipValueField.classList.add('content');
				ipValueField.textContent = value.ip;
				let mainObject = document.createElement('div');
				mainObject.classList.add('line');
				mainObject.appendChild(ipfield);
				mainObject.appendChild(ipValueField);
				document.querySelector('.multiip .content').appendChild(mainObject);
			}
		});
		document.querySelector('.multiip').style.display = "block";
		document.querySelector('.multiip .clickable').addEventListener("click", function(){
			if (document.querySelector('.multiip .content').style.display == "none") {
				document.querySelector('.multiip .content').style.display = "block";
			} else {
				document.querySelector('.multiip .content').style.display = "none";
			}
		});
	}
	//document.querySelector('.country').textContent = responseLookupData.location.country;
}
