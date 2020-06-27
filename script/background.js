"use strict";

// local cache to not request a new resolution on every page navigation
var cache = new Cache();
// cache to hold the info which IP is used by the client to access a target
var requestIPcache = new Cache({trim: 60*5, ttl: 60*60});
// request queue
var requestQueue = new Cache({trim: 10, ttl: 15});

// Fire if page is loading
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (changeInfo.status == "loading") {
		let domain = df.parseUrl(tab.url);
		let ipFromRequest = null;
		if (requestIPcache.has(domain)) {
			ipFromRequest = requestIPcache.get(domain);
		}
		df.domainLookup({tab: tabId, url: tab.url, ip: ipFromRequest });
	}
});

// Fire if page has loaded
chrome.webRequest.onResponseStarted.addListener(function (ret) {
	let ipFromRequest = null;
	let domain = df.parseUrl(ret.url);

	if (typeof ret.ip !== "undefined" && ret.ip != "") {
		ipFromRequest = ret.ip;
	} else if (requestIPcache.has(domain)) {
		ipFromRequest = requestIPcache.get(domain);
	}
	df.domainLookup({ tab: ret.tabId, url: ret.url, ip: ipFromRequest });

	// cache client obtained IP address to cache for later use
	if (ipFromRequest != null) {
		requestIPcache.set(domain, ret.ip);
	}
}, {
	urls: ["<all_urls>"],
	types: ["main_frame"]
});

// extension started, request data for every open tab to show correct icon
// if not done, user has to navigate to a new page for icon to be loaded
chrome.windows.getAll({ populate: true }, function (windows) {
	allTabs(windows);
});
function allTabs(windows) {
	for (let windowID = 0; windowID < windows.length; windowID++) {
		for (let tab = 0; tab < windows[windowID].tabs.length; tab++) {
			df.domainLookup({ tab: windows[windowID].tabs[tab].id, url: windows[windowID].tabs[tab].url });
		}
	}
}

// listen for incoming messages from other views
chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		if (request.type == "popup") {
			// parse url to a domain
			let domain = df.parseUrl(request.url);

			if (typeof request.action === "undefined" || request.action == "get") {
				if (cache.has(domain)) {
					sendResponse(cache.get(domain));
				} else {
					// no data is stored, popup should request it directly
					sendResponse(null)
				}
			} else if (request.action == "delete") {
				cache.delete(domain);
			}
			return;
		} else if (request.type == "resolved") {
			// get IP address which is used by the client to connect to the target server

			// parse url to a domain
			let domain = df.parseUrl(request.url);
			if (requestIPcache.has(domain)) {
				sendResponse(requestIPcache.get(domain));
			} else {
				// no data is stored, popup should request it directly
				sendResponse(null)
			}
			return;
		}
		// other messages not correctly implemented yet
		Sentry.withScope(function (scope) {
			scope.setExtra("request", request);
			scope.setExtra("sender", sender);
			Sentry.captureMessage("unknown runtime message");
		});
	}
);
