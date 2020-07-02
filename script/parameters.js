/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

// this is the main gateway between the chrome extension and the API backend
const api_protocol = "https";
//const api_domain = "dfdata.bella.network";
const api_domain = "udfdata.unterhaltungsbox.com";
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
checkCrashreportDisabled();
setInterval(function(){
	checkCrashreportDisabled();
}, 1000*60*15);

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
