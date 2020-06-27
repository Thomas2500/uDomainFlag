"use strict";
/*! uDomainFlag | Copyright 2020 Thomas Bella */

var getCurrentTab = function (callback) {
	chrome.tabs.query({
		windowId: chrome.windows.WINDOW_ID_CURRENT,
		active: true
	}, function (tabs) {
		callback(tabs[0]);
	});
};

getCurrentTab(function (data) {
	var match = data.url.match(/(.*)\:\/\/([^\/^\:^\[]{1,})/);
	var protocol = "";

	if (match !== null) {
		protocol = match[1].toLowerCase();
		//var domain = match[2].toLowerCase();
	} else {
		if (data.url.substring(0, 4) == "file") {
			var protocol = "file";
		}
	}

	var title = "";
	var information = "";

	if (protocol === "http" || protocol === "https" || protocol === "file" || protocol === "ftp" || protocol === "news") {
		title = _("unknown");
		information = _("domain_unknown");
	} else if (protocol === "chrome" || protocol === "opera" || protocol === "edge") {
		title = _("browser_ressource");
		information = _("local_ressource");
	} else if (protocol === "browser-extension" || protocol === "extension") {
		title = _("browser_extension");
		information = _("local_ressource");
	} else {
		title = _("unknown");
		information = _("domain_unknown");
	}

	document.querySelector('.title').textContent = title;
	// translate <br /> to \r\n
	document.querySelector('.information').innerText = information.replace(/<br \/>/g, "\r\n");
});
