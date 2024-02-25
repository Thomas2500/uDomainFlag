/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

// companyManaged is set to true if company is set in managed storage
let companyManaged = false;

// this is the main access address for the browser extension to the API backend
// if the primary domain can't be reached, fall back to the fallback domain
const api_protocol = "https";
const api_domain_primary = "dfdata.bella.network";
let api_domain = api_domain_primary;
const api_path = "";

// link to more information page to show additional data
const lookup_domain = "domainflag.bella.network";
const lookup_protocol = "https";

// Target where sentry pushes error records to
const sentry_target = "https://536650d775194abb959ebeb9f9e744e2@sentry.bella.pm/12";

// initialize sentry if CrashReports isn't disabled by user or GPO
Sentry.init({
	dsn: sentry_target,
	environment: "production",
	release: chrome.runtime.getManifest().version,
});

getObjectFromManagedStorage(["DisableCrashReports"]).then(function (value) {
	if (typeof value !== "undefined") {
		console.log(value);
		if (value == "true" || value === true) {
			Sentry.getCurrentHub().getClient().getOptions().enabled = false;
			return;
		}
	}
	// get option from sync storage
	getObjectFromSyncStorage(["DisableCrashReports"]).then(function (value) {
		if (typeof value !== "undefined") {
			console.log(value);
			if (value == "true" || value === true) {
				Sentry.getCurrentHub().getClient().getOptions().enabled = false;
				return;
			}
		}
	});
});


// determine if Server is set in managed storage and overwirte api_domain if set
getObjectFromManagedStorage(["Server"]).then(function (value) {
	if (typeof value !== "undefined") {
		api_domain = value;
	}
});
