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
	let ip = df.parseUrl(data.url);

	chrome.runtime.sendMessage({ type: "resolved", url: "https://" + ip + "/" }, function (response) {
		document.querySelector('.ip').classList.remove("loader");
		document.querySelector('.name').classList.remove("loader");
		document.querySelector('.name').textContent = _("unknown");

		if (response !== null) {
			document.querySelector('.ip').textContent = response;
		} else {
			document.querySelector('.ip').textContent = _("unknown");
		}
	});
});
