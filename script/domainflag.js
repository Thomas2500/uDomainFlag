"use strict";

var df = {

	domainLookup: function(data){
		// Check if local domain or local ip is requested
		let special = df.isSpecial(data.url);
		if (special !== false) {
			return df.setFlag(df.deepExtend({}, special, data));
		}

		// parse url to a domain
		let domain = df.parseUrl(data.url);

		// If something is wrong with the domain, display a question symbol
		if (domain === false || domain === "" || domain === "false") {
			return df.setFlag({ tab: data.tab, icon: "images/fugue/question-white.png", title: "No data found", popup: 'special.html' });
		}

		if (typeof data.ip === "undefined") {
			data.ip = null;
		}

		// check if resolved ip is local
		if (data.ip != null) {
			let special = df.isInternal(data.ip);
			if (special !== false) {
				return df.setFlag(df.deepExtend({}, special, data));
			}
		}

		// check if given domain is stored within cache
		if (cache.has(domain)) {
			return df.domainLookupResultData({ lookup: data, request: cache.get(domain) })
		}

		if (requestQueue.has(domain)) {
			return setTimeout(function(){
				df.domainLookup(data);
			}, 250);
		}
		requestQueue.set(domain, true);

		// requested url is not special and not in cache, request data from server
		let request = new XMLHttpRequest();
		request.open('GET', api_protocol + '://' + api_domain + api_path + '/lookup/' + domain, true);

		request.onload = function () {
			if (this.status == 200) {
				let parsedData = JSON.parse(this.response);
				if (parsedData === false) {
					// Something went wrong contacting the server
					let status = this.status;
					let response = this.response;
					Sentry.withScope(function (scope) {
						scope.setExtra("domain", domain);
						scope.setExtra("status", status);
						scope.setExtra("response", response);
						scope.setExtra("data", parsedData);
						Sentry.captureMessage("error parsing json response");
					});
					// TODO: error symbol
					return;
				}
				// Set cache and pass to result
				cache.set(domain, parsedData);
				df.domainLookupResultData({lookup: data, request: parsedData});
				requestQueue.remove(domain);
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
				requestQueue.remove(domain);
				// TODO: error symbol
				return;
			}
		};

		request.onerror = function () {
			requestQueue.remove(domain);
			// There was a connection error of some sort
			// this is nothing we should report because we do not have error data
			// or can do anything about it. mostly connection issues from the user
			// TODO: error symbol
		};

		request.send();
	},

	domainLookupResultData: function(data){
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
			return df.setFlag({
				tab: data.lookup.tab,
				icon: "images/fugue/question-white.png",
				title: "Error fetching data from server.\nPlease try again",
				popup: 'special.html'
			});
		}

		let title = "";
		if (typeof data.request.location.country !== "undefined") {
			title += data.request.location.country + "\n";
		} else {
			title += data.request.location.shortcountry + "\n";
		}

		if (typeof data.request.location.region !== "undefined") {
			title += data.request.location.region + "\n";
		}

		if (typeof data.request.location.city !== "undefined") {
			title += data.request.location.city;
		}

		// Everything looked up, set correct flag
		df.setFlag({
			tab: data.lookup.tab,
			icon: data.request.location.shortcountry.toLowerCase(),
			title: title
		});
	},

	setFlag: function(data) {
		try {
			// Check if data is correct
			if (typeof data !== "object") {
				throw new Error("First argument must be an object");
			}

			// check if tab is available
			if (typeof data.tab === "undefined") {
				throw new Error("Object.tab must be specified");
			}

			if (data.tab <= 0){
				return;
			}

			// get/find icon
			var icon = "images/logo-16x16.png";
			if (typeof data.icon !== "undefined" && data.icon !== "") {
				if (data.icon.length === 2 || data.icon === "null") {
					icon = "images/flag/" + data.icon + ".png";
				} else {
					icon = data.icon;
				}
			}

			// removed, painted using canvas
			//chrome.browserAction.setIcon({ tabId: data.tab, path: icon });

			if (typeof data.popup !== "undefined") {
				chrome.browserAction.setPopup({ tabId: data.tab, popup: data.popup });
			} else {
				chrome.browserAction.setPopup({ tabId: data.tab, popup: 'popup.html' });
			}

			if (typeof data.title !== "undefined") {
				chrome.browserAction.setTitle({ tabId: data.tab, title: data.title });
			}

			// in some browsers the icon is painted blurry because it is always stretched
			// create a pseudo 16x16 canvas element and place flag inside
			var canvas = document.createElement("canvas");
			canvas.width = 16;
			canvas.height = 16;
			var ctx = canvas.getContext("2d");
			ctx.clearRect(0, 0, 16, 16);

			var image = new Image();
			image.onload = function () {
				ctx.drawImage(image, Math.floor((16 - image.width) / 3), Math.floor((16 - image.height) / 2));
				chrome.browserAction.setIcon({ tabId: data.tab, imageData: ctx.getImageData(0, 0, 16, 16) });
			};
			image.src = icon;
		}
		catch (e) {
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
			var reg = /(brave|edge|chrome|chrome-extension|extension|opera|http|https|ftp)\:\/\/([^\/^\:^\[]{1,})/;
			var regFirefox = /(about)\:([^\/^\:^\[]{1,})/;

			if (regFirefox.test(url)) {
				var match = url.match(regFirefox);

				// firefox internal url
				if (match[1] == 'about') {
					return { icon: "images/fugue/computer.png", title: "Browser", popup: 'special.html' };
				}
			}

			if (reg.test(url)) {
				var match = url.match(reg);

				// Chrome extension - internal
				if (match[1] == 'chrome' || match[1] == 'chrome-extension' || match[1] == 'opera' || match[1] == 'edge' || match[1] == 'extension' || match[1] == 'brave') {
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
			} else {
				// Check if domain is an IPv6 address
				var reg = /\[([0-9a-fA-F\:\%]*)\]/;
				if (reg.test(url)) {
					var match = url.match(reg);
					var domain = match[1];
				}
			}
			// Check if IP is internal
			var isinternal = this.isInternal(domain);
			if (isinternal !== false) {
				return isinternal;
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

			// Private & documantation
			if (ip.match(/^198\.51\.100\.([0-9]{1,3})$/)) {
				return { icon: "images/fugue/home-network.png", title: "Example range for documentation and private use", popup: 'internal.html' };
			}

			// Private & documantation
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
	}
};

// Simple internationalization
function _(variable, object) {
	var lang = variable;
	if (typeof object === "undefined") {
		lang = chrome.i18n.getMessage(variable).replace(/\n/g, "<br />");
	} else {
		lang = chrome.i18n.getMessage(variable, object).replace(/\n/g, "<br />");
	}

	if (lang.length == 0) {
		Sentry.withScope(function (scope) {
			scope.setExtra("variable", variable);
			Sentry.captureMessage("given language string not found or translated");
		});
		lang = "#>>" + variable + "<< unknown#";
	}

	return lang;
}
