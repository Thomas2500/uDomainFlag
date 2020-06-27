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

// enable submission of error reports if errorReporting is not disabled
if (errorReports && typeof Sentry !== "undefined") {
	Sentry.init({
		dsn: sentry_target,
		release: extensionVersion
	});
}
