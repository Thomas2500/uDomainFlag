/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

// this is the main access address for the browser extension to the API backend
// if the primary domain can't be reached, fall back to the fallback domain
const api_protocol = "https";
const api_domain_primary = "dfdata.bella.network";
const api_domain_fallback = "udfdata.unterhaltungsbox.com";
var api_domain = api_domain_primary;
const api_path = "";

// link to more information page to show additional data
const lookup_domain = "domainflag.bella.network";
const lookup_protocol = "https";

// Target where sentry pushes error records to
const sentry_target = "https://536650d775194abb959ebeb9f9e744e2@sentry.bella.pm/12";

// set to true if policy settings exists and extension is therefore managed
var companySettings = false;

// error reporting (sentry) can be disabled by the user
var errorReports = (typeof localStorage["errorReports"] !== "undefined") ? localStorage["errorReports"] : "true";
localStorage["errorReports"] = errorReports;

// get settings from synced storage
if (typeof chrome.storage !== "undefined" && typeof chrome.storage.sync !== "undefined") {
	chrome.storage.sync.get(["errorReports"], function (syncedStorage) {
		// check if error reports are disabled by policy - this overrules custom settings when disabled
		// when policy is set to false (do not disable), user can still decide if data should be transmitted
		// sync storage should not be overwritten because this can be a company device with a private browser profile
		if (typeof localStorage["policyDisableCrashReports"] !== "undefined" && localStorage["policyDisableCrashReports"]) {
			errorReports = localStorage["errorReports"] = false;
		} else if (typeof syncedStorage.errorReports !== "undefined") {
			errorReports = localStorage["errorReports"] = syncedStorage.errorReports;
		}
	});
}

// get settings from managed storage
if (typeof chrome.storage !== "undefined" && typeof chrome.storage.managed !== "undefined") {
	chrome.storage.managed.get(["DisableCrashReports", "Server", "DisableServerFallback", "Secret"], function (syncedStorage) {
		if (typeof syncedStorage.DisableCrashReports !== "undefined") {
			companySettings = true;
			localStorage["policyDisableCrashReports"] = syncedStorage.DisableCrashReports;
			errorReports = localStorage["errorReports"] = syncedStorage.DisableCrashReports;
		} else {
			localStorage["policyDisableCrashReports"] = null;
		}
		if (typeof syncedStorage.Server !== "undefined" && localStorage["policyServer"] != "" && localStorage["policyServer"] != "false") {
			companySettings = true;
			api_domain = localStorage["policyServer"] = syncedStorage.Server;
		} else {
			localStorage["policyServer"] = null;
		}
		if (typeof syncedStorage.DisableServerFallback !== "undefined") {
			companySettings = true;
			localStorage["policyDisableServerFallback"] = syncedStorage.DisableServerFallback;
		} else {
			localStorage["policyDisableServerFallback"] = null;
		}
		if (typeof syncedStorage.Secret !== "undefined") {
			companySettings = true;
			localStorage["policySecret"] = syncedStorage.Secret;
		} else {
			localStorage["policySecret"] = null;
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
	let serverToCheck = api_domain_primary;
	if (typeof localStorage["policyServer"] !== "undefined" && localStorage["policyServer"] != "" && localStorage["policyServer"] != "false" && localStorage["policyServer"] != "null") {
		serverToCheck = localStorage["policyServer"];
	}
	if (api_domain != serverToCheck) {
		let request = new XMLHttpRequest();
		request.open('GET', api_protocol + '://' + serverToCheck + api_path + '/reachable', true);
		request.onload = function() {
			if (this.status == 200 && this.response.trim() == "Be kind whenever possible. It is always possible.") {
				api_domain = serverToCheck;
			} else {
				// Something went wrong and the content doesn't match our prediction
				api_domain = df.handleFallback();
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

// enable submission of error reports if errorReporting is not disabled
if (errorReports && typeof Sentry !== "undefined") {
	Sentry.init({
		dsn: sentry_target,
		release: extensionVersion,
		beforeSend(event) {
			// check if reporting is disabled by user or remote
			if (errorReports == false || localStorage["errorReports"] == "false") {
				return null;
			}
			return event;
		}
	});
}
