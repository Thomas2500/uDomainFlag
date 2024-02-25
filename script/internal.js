/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

const getCurrentTab = function (callback) {
	chrome.tabs.query({
		windowId: chrome.windows.WINDOW_ID_CURRENT,
		active: true
	}, function (tabs) {
		callback(tabs[0]);
	});
};

getCurrentTab(function (data) {
	// get current URL which may contain additional data, e.g. popup.html#ip=185.128.246.155&a=b
	let url = new URL(window.location.href);
	let metadata = {};
	url = url.hash.replace("#", "");
	url.split("&").forEach(function (item) {
		metadata[item.split("=")[0]] = item.split("=")[1]
	});

	document.querySelector('.ip').classList.remove("loader");
	document.querySelector('.name').classList.remove("loader");
	document.querySelector('.name').textContent = _("internal_domain");

	if (metadata.ip !== null) {
		document.querySelector('.ip').textContent = metadata.ip;
	} else {
		document.querySelector('.ip').textContent = _("unknown");
	}

	// if company
});
