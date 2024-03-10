/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

let storageCache = [];

const df = {
	processLastError: function(){
		if (chrome.runtime.lastError) {
			console.warn(chrome.runtime.lastError);
			Sentry.withScope(function (scope) {
				scope.setExtra("lastError", chrome.runtime.lastError);
				Sentry.captureMessage("lastError");
			});
		}
	},

	countryLookup: async function(data){
		// Check if local domain or local ip is requested
		let special = df.isSpecial(data.url);
		if (special !== false) {
			if (typeof data.ip !== "undefined" && data.ip !== null) {
				special.popup += "#ip=" + data.ip;
			}
			return df.setFlag(df.deepExtend({}, special, data));
		}

		// parse url to a domain
		let domain = df.parseUrl(data.url);

		// If something is wrong with the domain, display a question symbol
		if (domain === false || domain === "" || domain === "false") {
			return df.setFlag({ tab: data.tab, icon: "images/fugue/question-white.png", title: "No data found", popup: 'special.html' });
		}

		// Set data.ip to null if data is not available
		if (typeof data.ip === "undefined") {
			data.ip = null;
		}

		// check if resolved ip is local
		// skip if companySettings are active and local lookup is possible
		if (data.ip != null) {
			let special = df.isInternal(data.ip);
			if (special !== false) {
				if (typeof data.ip !== "undefined" && data.ip !== null) {
					special.popup += "#ip=" + data.ip;
				}
				return df.setFlag(df.deepExtend({}, special, data));
			}
		}

		// create header for request
		let headers = {
			'Content-Type': 'application/json',
			'Secret': await df.getValueFromStorage("Secret"),
			'X-UUID': await df.getValueFromStorage("UUID"),
		};

		// if secret is not set, remove it from header
		// only active if relay service server is enabled by company policy
		if (headers.Secret === null || headers.Secret === undefined || headers.Secret === "") {
			delete headers.Secret;
		}

		// if relay dynamic path response is enabled, add header of current url
		// this allows dynamic icon change based on the current url
		// only active if relay service server is enabled by company policy
		if (await df.getValueFromStorage("RDPR") == "enabled") {
			headers["X-RDPR"] = data.url;
		}

		// if relay locally used resolved ip is enabled, add header of current ip
		// this allows to display a different icon if MITM was detected
		// only active if relay service server is enabled by company policy
		if (data.ip != null && await df.getValueFromStorage("RLURIP") == "enabled") {
			headers["X-RLURIP"] = data.ip;
		}

		// fetch country of destination from upstream server
		fetch(api_protocol + '://' + (await df.getAPIDomain()) + api_path + '/country/' + domain, {
			method: 'GET',
			cache: 'default',
			headers: headers,
		}).then(response => response.json(), df.processLastError).then((parsedData) => {
			if (parsedData.success) {
				let meta = { lookup: data, request: parsedData };
				if (data.ip != null) {
					meta.ip = data.ip;
				}

				df.domainCountryLookupResultData(meta);
			} else if (parsedData.success === false) {
				let error = "uDomainFlag server was not able to resolve the country of the domain.\nPlease try again later.";
				if (typeof parsedData.error !== "undefined" && parsedData.error !== "" && parsedData.error != "doh: all query failed") {
					error = parsedData.error;
				}
				df.setFlag({ tab: data.tab, icon: "images/special-flag/unknown.png", title: error, popup: 'special.html' });
			} else {
				df.setFlag({ tab: data.tab, icon: "images/fugue/network-status-busy.png", title: "uDomainFlag server not reachable", popup: 'offline.html' });
				Sentry.withScope(function (scope) {
					scope.setExtra("domain", domain);
					scope.setExtra("response", response);
					Sentry.captureMessage("no success response from backend");
				});
				api_domain = df.handleFallback();
				return;
			}
		}).catch((result) => {
			console.log(result);
			df.setFlag({ tab: data.tab, icon: "images/fugue/network-status-busy.png", title: "uDomainFlag server not reachable", popup: 'offline.html' });
			api_domain = df.handleFallback();
			console.warn(api_domain);
		});
	},

	domainCountryLookupResultData: function(data){
		// Check if data is correct
		if (typeof data !== "object") {
			throw new Error("First argument must be an object");
		}

		// check if lookup is available
		if (typeof data.lookup === "undefined") {
			throw new Error("Object.lookup must be specified");
		}

		// check if tab is available
		if (typeof data.lookup.tab === "undefined") {
			throw new Error("Object.lookup.tab must be specified");
		}

		// check if request is available
		if (typeof data.request === "undefined") {
			throw new Error("Object.request must be specified");
		}

		// Problem on backend, show question mark
		if (!data.request.success) {
			console.warn(data);
			let title = "Error fetching data from server.\nPlease try again later.";
			if (typeof data.request.error !== "undefined" && data.request.error !== "") {
				title = data.request.error;
			}

			Sentry.withScope(function (scope) {
				scope.setExtra("data", data);
				Sentry.captureMessage("no success response from backend");
			});

			return df.setFlag({
				tab: data.lookup.tab,
				icon: "images/fugue/question-white.png",
				title: title,
				popup: 'special.html'
			});
		}

		let title = "";
		if (typeof data.request.shortcountry !== "undefined") {
			if (data.request.shortcountry.length == 2) {
				let tryCountryLookup = getCountryName(data.request.shortcountry);
				title += tryCountryLookup;
			} else {
				title += data.request.shortcountry;
			}
		}

		// determine if custom icon is available
		let flagIcon = data.request.shortcountry.toLowerCase();
		if (typeof data.request.customflag !== "undefined") {
			flagIcon = data.request.customflag;
		}

		let popup = "popup.html#";
		if (typeof data.ip !== "undefined" && data.ip !== null) {
			popup += "ip=" + data.ip;
		}

		// Everything looked up, set correct flag
		df.setFlag({
			tab: data.lookup.tab,
			icon: flagIcon,
			title: title,
			popup: popup
		});
	},

	callbackLookup: async function(backend, data, callback){
		// parse url to a domain
		let domain = df.parseUrl(data.url);

		// If something is wrong with the domain, display a question symbol
		if (domain === false || domain === "" || domain === "false") {
			return callback({ success: false, error: "Invalid domain name requested" });
		}

		// Set data.ip to null if data is not available
		if (typeof data.ip === "undefined") {
			data.ip = null;
		}

		// create header for request
		let headers = {
			'Content-Type': 'application/json',
			'Secret': await df.getValueFromStorage("Secret"),
			'X-UUID': await df.getValueFromStorage("UUID"),
		};

		// if secret is not set, remove it from header
		// only active if relay service server is enabled by company policy
		if (headers.Secret === null || headers.Secret === undefined || headers.Secret === "") {
			delete headers.Secret;
		}

		// if relay dynamic path response is enabled, add header of current url
		// this allows dynamic icon change based on the current url
		// only active if relay service server is enabled by company policy
		if (await df.getValueFromStorage("RDPR") == "enabled") {
			headers["X-RDPR"] = data.url;
		}

		// if relay locally used resolved ip is enabled, add header of current ip
		// this allows to display a different icon if MITM was detected
		// only active if relay service server is enabled by company policy
		if (data.ip != null && await df.getValueFromStorage("RLURIP") == "enabled") {
			headers["X-RLURIP"] = data.ip;
		}

		// fetch lookup of destination from upstream server
		fetch(api_protocol + '://' + (await df.getAPIDomain()) + api_path + '/' + backend + '/' + domain, {
			method: 'GET',
			cache: 'default',
			headers: headers,
		}).then(response => response.json()).then((parsedData) => {
			if (typeof parsedData.success !== "undefined") {
				return callback(parsedData);
			}
		}).catch((result) => {
			console.warn(result);
			api_domain = df.handleFallback();
			return callback({ success: false, error: "uDomainFlag server not reachable", catch: result });
		});
	},

	// setFlag sets a flag icon and title for a tab
	setFlag: async function(data) {
		try {
			// Check if data is correct
			if (typeof data !== "object") {
				throw new Error("First argument must be an object");
			}

			// check if tab is available
			if (typeof data.tab === "undefined") {
				throw new Error("Object.tab must be specified");
			}

			// ignore request if tab is less than 0 because it is a background page
			if (data.tab <= 0){
				return;
			}

			// load icon first because icon is reset on every page navigation
			var icon;
			if (typeof data.icon !== "undefined" && data.icon !== "") {
				if (data.icon.length === 2 || data.icon === "null" || data.icon === "catalonia" || data.icon == "england" || data.icon === "scotland" || data.icon === "wales" || data.icon === "fam") {
					// icon is a country code
					icon = await createImageBitmap(await (await fetch("images/flag/" + data.icon + ".png")).blob());
				} else if (data.icon.substring(0, 7) == "images/") {
					// Locally stored icon (e.g. custom flag)
					icon = await createImageBitmap(await (await fetch(data.icon)).blob());
				} else {
					// Icon from server supplied using customflag
					// we expect a base64 encoded image like data:image/png;base64,[...] here
					icon = await createImageBitmap(await (await fetch(data.icon)).blob());
				}
			} else {
				// no icon specified, use default icon
				icon = await createImageBitmap(await (await fetch("images/logo-16x16.png").blob()));
			}

			// in some browsers the icon is painted blurry because it is always stretched
			// create a pseudo 16x16 canvas element and place flag inside
			// this will prevent the icon from being stretched and will look sharp
			var canvas = new OffscreenCanvas(16, 16);
			var ctx = canvas.getContext("2d");
			ctx.clearRect(0, 0, 16, 16);
			ctx.drawImage(icon, Math.floor((16 - icon.width) / 3), Math.floor((16 - icon.height) / 2));
			chrome.action.setIcon({ tabId: data.tab, imageData: ctx.getImageData(0, 0, 16, 16) });

			// set popup data before changing other data
			if (typeof data.popup !== "undefined") {
				await chrome.action.setPopup({ tabId: data.tab, popup: data.popup });
			} else {
				await chrome.action.setPopup({ tabId: data.tab, popup: 'popup.html' });
			}

			// set title if a title is available
			if (typeof data.title !== "undefined") {
				chrome.action.setTitle({ tabId: data.tab, title: data.title });
			}
		}
		catch (e) {
			console.error(e);
			Sentry.withScope(function (scope) {
				scope.setExtra("setflag", data);
				Sentry.captureException(e);
			});
		}
	},

	isSpecial: function (tab) {
		/*
			url -> string | url.url -> string
			return { icon: "images/...", title: "Title", popup: "Popup.html"} | false
		*/
		try {
			if (typeof tab === "object") {
				var url = tab.url;
			} else if (typeof tab === "string") {
				var url = tab;
			} else {
				throw new Error("No url given");
			}

			if (url === "") {
				throw new Error("no url given");
			}

			// Split domain
			var reg = /(.*)\:\/\/([^\/^\:^\[]{1,})/;

			if (reg.test(url)) {
				var match = url.match(reg);

				// Chrome extension - internal
				if (match[1] == 'chrome' || match[1] == 'about' || match[1] == 'chrome-extension' || match[1] == 'opera' || match[1] == 'edge' || match[1] == 'extension' || match[1] == 'brave') {
					return { icon: "images/fugue/computer.png", title: "Browser", popup: 'special.html' };
				}

				// Dotless domain (mostly internal e.g. start, login, hotspot)
				if (match[2].indexOf('.') == -1) {
					return { icon: "images/fugue/network.png", title: "Local domain", popup: 'internal.html' };
				}

				// Domain with ending dot -> interpret without dot
				var tmp = match[2].match(/(.*)\.$/);
				if (tmp != null) {
					match[2] = tmp[1];
				}

				// check tld
				var domain = match[2];
				var tld = domain.match(/([^\.]*)$/);
				tld = tld[1];

				// Tor network | RFC7686 & .exit added in addition
				if (tld == 'onion' || tld == 'exit') {
					return { icon: "images/special-flag/tor.png", title: "Tor network", popup: 'special.html' };
				}

				// Test | RFC6761 | treat them special because target server can't know the destination address
				if (tld == 'test') {
					return { icon: "images/special-flag/network.png", title: "Test network", popup: 'internal.html' };
				}

				// localhost | RFC6761
				if (tld == 'localhost') {
					return { icon: "images/fugue/computer.png", title: "localhost network", popup: 'special.html' };
				}

				// invalid | RFC6761
				if (tld == 'invalid') {
					return { icon: "images/special-flag/cross-circle.png", title: "invalid network", popup: 'special.html' };
				}
			}
			// Check if IP is internal
			let isInternal = this.isInternal(domain);
			if (isInternal !== false) {
				return isInternal;
			}
			return false;
		}
		catch (e) {
			console.error(e);
			Sentry.withScope(function (scope) {
				scope.setExtra("data", data);
				Sentry.captureException(e);
			});
		}
	},

	isInternal: function (ip) {
		try {
			if (typeof ip === "undefined") {
				return false;
			}

			// Convert to string
			ip = String(ip);

			// Check if IP is empty
			if (ip.length == 0) {
				return false;
			}

			// IPv4 - special addresses

			// Special networks (private, RFC)
			if (ip.match(/^10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/office-network.png", title: "Private network", popup: 'internal.html' };
			}

			// Localhost
			if (ip == "127.0.0.1") {
				return { icon: "images/fugue/computer.png", title: "Computer", popup: 'special.html' };
			}

			// Localnet
			if (ip.match(/^127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/computer-network.png", title: "Computer network", popup: 'special.html' };
			}

			// Link local
			if (ip.match(/^169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/computer-network.png", title: "Link local - No DHCP found", popup: 'special.html' };
			}

			// Private - 172.16-31.XXX.XXX
			if (ip.match(/^172\.(16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/network.png", title: "Private network", popup: 'internal.html' };
			}

			// IETF protocol assignments
			if (ip.match(/^192\.0\.0\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/network.png", title: "IETF protocol assignments", popup: 'special.html' };
			}

			// Documentation range
			if (ip.match(/^192\.0\.2\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/network.png", title: "Example range for documentation and private use", popup: 'special.html' };
			}

			// IP 6to4 relay anycast
			if (ip.match(/^192\.88\.99\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/network.png", title: "IP 6to4 relay anycast", popup: 'special.html' };
			}

			// Private - 192.168.XXX.XXX
			if (ip.match(/^192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/home-network.png", title: "Private network", popup: 'internal.html' };
			}

			// ISP - Benchmark network
			if (ip.match(/^198\.(18|19)\.([0-9]{1,3})\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/home-network.png", title: "Benchmark network", popup: 'special.html' };
			}

			// Private & documentation
			if (ip.match(/^198\.51\.100\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/home-network.png", title: "Example range for documentation and private use", popup: 'internal.html' };
			}

			// Private & documentation
			if (ip.match(/^203\.0\.113\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/home-network.png", title: "Example range for documentation and private use", popup: 'special.html' };
			}

			// Multicast
			if (ip.match(/^224\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/computer-network.png", title: "Multicast network", popup: 'special.html' };
			}

			// Shared - SAS
			if (ip.match(/^100\.(64|65|66|67|68|69|70|71|72|73|74|75|76|77|78|79|80|81|82|83|84|85|86|87|88|89|90|91|92|93|94|95|96|97|98|99|100|101|102|103|104|105|106|107|108|109|110|111|112|113|114|115|116|117|118|119|120|121|122|123|124|125|126|127)\.([0-9]{1,3})\.([0-9]{1,3})$/)) {
				return { icon: "images/logo-16x16.png", title: "Shared Address Space", popup: 'special.html' };
			}

			// IPv6 - special addresses

			// Link-Local (fe80)
			if (ip.match(/^fe80\:([0-9A-Fa-f\:\%]*)$/)) {
				return { icon: "images/fugue/home-network.png", title: "Private network (Link-Local)", popup: 'internal.html' };
			}

			// Unique Local Unicast (Private network)
			if (ip.match(/^f(c|d)([0-9A-Fa-f]{1,2}|)\:([0-9A-Fa-f\:\%]*)$/)) {
				return { icon: "images/fugue/home-network.png", title: "Private network (Unique Local Unicast)", popup: 'internal.html' };
			}

			// 6to4
			if (ip.match(/^2002\:([0-9A-Fa-f\:\%]*)$/)) {
				return { icon: "images/fugue/network.png", title: "IP 6to4 network", popup: 'special.html' };
			}

			// Localhost
			if (ip == "::1") {
				return { icon: "images/fugue/computer.png", title: "Computer", popup: 'special.html' };
			}

			return false;
		}
		catch (e) {
			Sentry.withScope(function (scope) {
				scope.setExtra("ip", ip);
				Sentry.captureException(e);
			});
		}
	},

	parseUrl: function(url) {
		let match = url.match(/(chrome|chrome-extension|opera|http|https|ftp)\:\/\/([^\/^\:^\[]{1,})/);
		if (match == null) {
			match = url.match(/\[([^\.]{3,})\]/);
			if (match == null) {
				return false;
			}
			return match[1];
		}
		let tmp = match[2].match(/(.*)\.$/);
		if (tmp != null) {
			match[2] = tmp[1];
		}
		return match[2];
	},

	deepExtend: function (out) {
		out = out || {};

		for (var i = 1; i < arguments.length; i++) {
			var obj = arguments[i];

			if (!obj) {
				continue;
			}

			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					if (typeof obj[key] === 'object') {
						if (obj[key] instanceof Array == true) {
							out[key] = obj[key].slice(0);
						} else {
							out[key] = df.deepExtend(out[key], obj[key]);
						}
					} else {
						out[key] = obj[key];
					}
				}
			}
		}

		return out;
	},

	schedule: async function (data) {
		if (data === null || typeof data.name === "undefined") {
			return false;
		}

		// execute based on schedule name
		switch (data.name) {
			case "reachableCheck":
				df.handleFallbackRecovery();
				break;
			case "companySync":
				df.getServerFeatureFlag("companysync", function (response) {
					if (response !== false && response.enabled === true && typeof response.extra !== "undefined") {
						for (const [key, value] of Object.entries(response.extra)) {
							saveObjectInLocalStorage({ [key]: value });

							// remove matching entry from storageCache
							if (typeof storageCache[key] !== "undefined") {
								delete storageCache[key];
							}
						}
					}
				});
				break;
			default:
				return false;
		}
	},

	handleOnInstalled: function(details) {
		// Check if UUID is set
		df.checkUUID();
		console.log("onInstalled: " + details.reason);

		if (typeof details.previousVersion == "undefined") {
			// extension was newly installed - currently nothing is needed
			// to prepare extension for use
		} else if (typeof details.reason !== "undefined" && details.reason == "update" || details.previousVersion != chrome.runtime.getManifest().version) {
			// update was performed
			// clear all caches
			chrome.storage.local.clear();
		}
	},

	handleUpdate: function() {
		chrome.runtime.reload();
	},

	getAPIDomain: async function() {
		// get API domain from session storage
		let apiDomain = await getObjectFromSessionStorage("Server");
		if (typeof apiDomain !== "undefined" && apiDomain !== null && apiDomain !== "") {
			saveObjectInSessionStorage({Server: apiDomain});
			return apiDomain;
		}

		// session storage is not filled, determine if managed storage set a domain
		let managedDomain = await getObjectFromManagedStorage("Server");
		if (typeof managedDomain !== "undefined" && managedDomain !== null && managedDomain !== "") {
			saveObjectInSessionStorage({Server: managedDomain});
			return managedDomain;
		}

		// managed storage is not filled, use default domain
		saveObjectInSessionStorage({Server: api_domain_primary});
		return api_domain_primary;
	},

	handleFallback: async function(){
		// get from managed storage the configured server - if set
		let server = await getObjectFromManagedStorage("Server");
		if (server !== undefined && server !== null && server !== "") {
			// determine if fallback is enabled
			// and use fallback address if target can't be reached
			let fallback = await getObjectFromManagedStorage("DisableServerFallback");
			if (fallback !== undefined && fallback !== null && (fallback === true || fallback === "true" || fallback === "1")) {
				console.log("Setting "+server);
				saveObjectInSessionStorage({Server: server});
				return server;
			}
			console.log("Setting " + api_domain_primary);
			saveObjectInSessionStorage({Server: api_domain_primary});
			return api_domain_primary;
		}

		// get currently used server from session storage
		server = await getObjectFromSessionStorage("Server");
		if (server !== undefined && server !== null && server !== "" && server != api_domain_primary) {
			console.log("Setting " + api_domain_secondary);
			saveObjectInSessionStorage({Server: api_domain_secondary});
			return api_domain_secondary;
		}

		/*
		if (typeof localStorage["policyDisableServerFallback"] !== "undefined" && localStorage["policyDisableServerFallback"] == "true") {
			if (typeof localStorage["policyServer"] !== "undefined") {
				if (localStorage["policyServer"] != "" && localStorage["policyServer"] != "false") {
					return localStorage["policyServer"];
				}
			}
			return api_domain_primary;
		}
		if (typeof localStorage["policyServer"] !== "undefined" && localStorage["policyServer"] != "" && localStorage["policyServer"] != "false") {
			if (api_domain == localStorage["policyServer"]) {
				return api_domain_primary;
			}
		}
		*/
		console.warn("fallback called");
		return api_domain_fallback;
	},

	getServerFeatureFlag: async function(flagLabel, callback){
		// create header for request
		let headers = {
			'Content-Type': 'application/json',
			'Secret': await df.getValueFromStorage("Secret"),
			'X-UUID': await df.getValueFromStorage("UUID"),
		};

		// if secret is not set, remove it from header
		if (headers.Secret === null || headers.Secret === undefined || headers.Secret === "") {
			delete headers.Secret;
		}

		await fetch(api_protocol + '://' + (await df.getAPIDomain()) + api_path + '/flags/' + flagLabel, {
			method: 'GET',
			cache: 'no-cache',
			headers: headers,
		}).then(response => response.json()).then((parsedData) => {
			// if response contains the key "enabled", it was valid and can be returned
			if (typeof parsedData.enabled !== "undefined") {
				return callback(parsedData);
			}

			// if response is not valid, return false
			return false;
		}).catch((result) => {
			return false;
		});
	},

	handleFallbackRecovery: async function(){
		// get currently used domain from session storage
		let server = await getObjectFromSessionStorage("Server");
		// if content of variable isn't set, we have to initiate it with getAPIDomain
		if (typeof server === "undefined" || server === null || server === "") {
			server = await df.getAPIDomain();
		}

		let serverToCheck = null;

		// get from managed storage the configured server - if set
		let managedDomain = await getObjectFromManagedStorage("Server");
		if (managedDomain !== undefined && managedDomain !== null && managedDomain !== "") {
			// check if server is managed domain, if true we do not need to recover
			if (server == managedDomain) {
				return;
			}
			// fallback occured and we have to check if primary is reachable
			serverToCheck = managedDomain;
		}

		if (server != api_domain_primary) {
			// fallback occured and we have to check if primary is reachable
			serverToCheck = api_domain_primary;
		}

		if (serverToCheck !== null) {
			// check using fetch if target is reachable
			let response = await fetch(api_protocol + '://' + serverToCheck + api_path + '/reachable', {
				method: 'GET',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'plain/text',
					'Secret': await getObjectFromManagedStorage(["Secret"]),
				},
			})
			.then((response) => response.text())
			.then((data) => {
				// target seems to be reachable
				// check if response is correct and matches the expected response
				if (data.trim() == "Be kind whenever possible. It is always possible.") {
					// set serverToCheck as new server
					saveObjectInSessionStorage({Server: serverToCheck});
				} else {
					// target is not reachable, do not try to recover
				}
				console.log('Success:', data);
			})
			.catch((error) => {
				// target is not reachable, do not try to recover
			});
		}
	},

	// generateUUID generates a UUID v4
	generateUUID: function() {
		return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
			(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
		);
	},

	// checkUUID checks if UUID is set, if not generate one and set it to sync storage
	// this is used to identify malicious requests and sources to early drop the request
	// and prevent further processing. After malicious request detection the header is removed
	// and the request is processed normally.
	checkUUID: async function() {
		// check if UUID is set, if not generate one and set it to sync storage
		let uuid = await getObjectFromSyncStorage("UUID");
		if (typeof uuid === "undefined" || uuid === null || uuid === "") {
			let uuid = df.generateUUID();
			saveObjectInSyncStorage({ "UUID": uuid });
		}
	},

	// getValueFromStorage gets a value from storage
	// first check if value is available from local variable
	// if not check if value is available in managed storage
	// if not check if value is available in sync storage
	// if not check if value is available in local storage
	// if not return null
	getValueFromStorage: async function(key) {
		if (typeof storageCache[key] !== "undefined") {
			return storageCache[key];
		}
		let value = await getObjectFromManagedStorage(key);
		if (value !== undefined && value !== null && value !== "") {
			storageCache[key] = value;
			return value;
		}
		value = await getObjectFromSyncStorage(key);
		if (value !== undefined && value !== null && value !== "") {
			storageCache[key] = value;
			return value;
		}
		value = await getObjectFromLocalStorage(key);
		if (value !== undefined && value !== null && value !== "") {
			storageCache[key] = value;
			return value;
		}
		return null;
	},
};

// Simple internationalization
function _(variable, object) {
	let lang = variable;
	if (typeof object === "undefined") {
		lang = chrome.i18n.getMessage(variable).replace(/\n/g, "<br />");
	} else {
		lang = chrome.i18n.getMessage(variable, object).replace(/\n/g, "<br />");
	}

	if (lang.length == 0) {
		Sentry.withScope(function (scope) {
			scope.setExtra("variable", variable);
			scope.setExtra("ui_locale", chrome.i18n.getMessage("@@ui_locale"));
			Sentry.captureMessage("given language string not found or translated");
		});
		lang = "#>>" + variable + "<< unknown#";
	}

	return lang;
}
