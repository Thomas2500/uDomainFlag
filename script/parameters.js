/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

// this is the main gateway between the chrome extension and the API backend
const api_protocol = "https";
var api_domain = "dfdata.bella.network";
const api_domain_primary = "dfdata.bella.network";
const api_domain_fallback = "udfdata.unterhaltungsbox.com";
const api_path = "";

const lookup_domain = "domainflag.unterhaltungsbox.com";
const lookup_protocol = "https";

// Target where sentry pushes the error records to
const sentry_target = "https://cefee7041a9d4b9ab9d71a3364cff5c2@sentry.bella.pm/6";

// error reporting (sentry)
var errorReports = (typeof localStorage["errorReports"] !== "undefined") ? localStorage["errorReports"] : "true";
localStorage["errorReports"] = errorReports;

// get settings from synced storage
if (typeof chrome.storage !== "undefined" && typeof chrome.storage.sync !== "undefined") {
	chrome.storage.sync.get(["errorReports"], function (syncedStorage) {
		if (typeof syncedStorage.errorReports !== "undefined") {
			errorReports = localStorage["errorReports"] = syncedStorage.errorReports;
		}
	});
}

// try to determine data about myself like extension version
var extensionVersion;
if (typeof chrome !== "undefined") {
	var manifestData = chrome.runtime.getManifest();
	extensionVersion = manifestData.version;
} else {
	extensionVersion = "UNKNOWN-VERSION";
}

// check if new domain is reachable and fallback to old domain including recovery after some time
// recovery is tried every 10 minutes - both domains refer to the same backend
setInterval(function() {
	if (api_domain != api_domain_primary) {
		let request = new XMLHttpRequest();
		request.open('GET', api_protocol + '://' + api_domain_primary + api_path + '/reachable', true);
		request.onload = function() {
			if (this.status == 200 && this.response.trim() == "Be kind whenever possible. It is always possible.") {
				api_domain = api_domain_primary;
			} else {
				// Something went wrong and the content doesn't match our prediction
				api_domain = api_domain_fallback;
				let status = this.status;
				let response = this.response;
				Sentry.withScope(function(scope) {
					scope.setExtra("action", "reachable");
					scope.setExtra("status", status);
					scope.setExtra("response", response);
					Sentry.captureMessage("invalid response from reachable check");
				});
			}
		};
		request.send();
	}
}, 1000*60*10);

// check if error reporting is globally disabled
// this is possible if a company uses a selfhosted instance
// and doesn't want error reports to be transmitted
var crashreportDisabled = false;
function checkCrashreportDisabled(){
	let request = new XMLHttpRequest();
	request.open('GET', api_protocol + '://' + api_domain + api_path + '/flags/disablecrashreport', true);
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
					scope.setExtra("flag", "disablecrashreport");
					scope.setExtra("status", status);
					scope.setExtra("response", response);
					Sentry.captureException(e);
				});
			}
			if (parsedData === false) {
				// Something went wrong contacting the server
				let status = this.status;
				let response = this.response;
				Sentry.withScope(function (scope) {
					scope.setExtra("flag", "disablecrashreport");
					scope.setExtra("status", status);
					scope.setExtra("response", response);
					scope.setExtra("data", parsedData);
					Sentry.captureMessage("error parsing json response");
				});
				return;
			}
			crashreportDisabled = parsedData.enabled;
		} else {
			// Something went wrong contacting the server
			let status = this.status;
			let response = this.response;
			Sentry.withScope(function (scope) {
				scope.setExtra("flag", "disablecrashreport");
				scope.setExtra("status", status);
				scope.setExtra("response", response);
				Sentry.captureMessage("error requesting data from server");
			});
			return;
		}
	};
	request.send();
}
// Check now and every 15 minutes if condition changes
/*
	--- DISABLED ---
	Company check is disabled for now because this causes too much requests
	I have to find a better idea here. Some sort of way to detect if
	GPO is active of some sort or is member of a domain.
	Ideas:
		- check if specific (.local?) domain is reachable and if yes use it for requests
		- allow overwrite of dfdata.bella.network - DNSSEC?
		- response modification based on source IP address? (must be static, ...)
		- how to check if client changed network - in my case VPN connect to company network - network change API?
	If you have an idea, please let me know!

	checkCrashreportDisabled();
	setInterval(function(){
		checkCrashreportDisabled();
	}, 1000*60*15);
*/

// enable submission of error reports if errorReporting is not disabled
if (errorReports && typeof Sentry !== "undefined") {
	Sentry.init({
		dsn: sentry_target,
		release: extensionVersion,
		beforeSend(event) {
			// check if reporting is disabled by user or remote
			if (errorReports == false || crashreportDisabled == true) {
				return null;
			}
			return event;
		}
	});
}
