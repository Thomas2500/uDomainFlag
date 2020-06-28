/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

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
