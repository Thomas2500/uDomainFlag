/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

// in firefox, the background script is not allowed to use importScripts
// if getObjectFromLocalStorage is not defined, we are in firefox
if (typeof getObjectFromLocalStorage === "undefined") {
	importScripts('script/sentry.min.js', 'script/storage.js', 'script/country.js', 'script/parameters.js', 'script/domainflag.js');
}

// set up scheduler to perform some background tasks
chrome.alarms.onAlarm.addListener(df.schedule);
chrome.alarms.create("reachableCheck", { periodInMinutes: 5.0 });
chrome.alarms.create("companySync", {
	periodInMinutes: 15.0,
	delayInMinutes: 0.5
});

// set up listener on application installation, update and startup
chrome.runtime.onInstalled.addListener(df.handleOnInstalled);
chrome.runtime.onUpdateAvailable.addListener(df.handleUpdate);
chrome.runtime.onStartup.addListener(function() {
	// check if UUID is set, if not generate one and set it to sync storage
	df.checkUUID();

	// Prefill session cache with used API domain
	df.getAPIDomain();
});

let ipCache = {};

// Fire if page is loading
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	// request is being made
	if (changeInfo.status == 'loading') {
		let data = { tab: tabId, url: tab.url };
		// get domain from url
		let domain = df.parseUrl(tab.url);
		// check if domain is in cache
		if (typeof ipCache[domain] !== "undefined") {
			data.ip = ipCache[domain];
		}
		df.countryLookup(data);
	}
});

// extension started, request data for every open tab to show correct icon
// if not done, user has to navigate to a new page for icon to be loaded
chrome.windows.getAll({ populate: true }, function (windows) {
	allTabs(windows);
});
function allTabs(windows) {
	for (let windowID = 0; windowID < windows.length; windowID++) {
		for (let tab = 0; tab < windows[windowID].tabs.length; tab++) {
			df.countryLookup({ tab: windows[windowID].tabs[tab].id, url: windows[windowID].tabs[tab].url });
		}
	}
	df.processLastError();
}

chrome.runtime.onMessage.addListener(function (message, sender, senderResponse) {
	switch (message.type) {
		case "popup":
			// parse url to a domain
			let domain = df.parseUrl(message.url);
			return senderResponse(ipCache[domain])
		default:
			Sentry.withScope(function (scope) {
				scope.setExtra("request", message);
				scope.setExtra("sender", sender);
				Sentry.captureMessage("unknown runtime message");
			});
	}
	df.processLastError();
});

// Fire if page has loaded
chrome.webRequest.onResponseStarted.addListener(function (ret) {
	// only fire if tabId is set
	if (ret.tabId == -1) {
		return;
	}

	// only fire if IP is included in response
	if (typeof ret.ip == "undefined" || ret.ip == "") {
		return;
	}

	// parse url to a domain and add it to ipCache
	let domain = df.parseUrl(ret.url);
	ipCache[domain] = ret.ip;

	// start lookup
	df.countryLookup({ tab: ret.tabId, url: ret.url, ip: ret.ip });

	// process errors
	df.processLastError();
}, {
	urls: ["<all_urls>"],
	types: ["main_frame"]
});
