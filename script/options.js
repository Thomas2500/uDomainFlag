/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

window.addEventListener('load', async function () {
	document.querySelector(".yourversion").textContent = _("options_yourversion", [chrome.runtime.getManifest().version, chrome.i18n.getMessage("@@extension_id")]);

	// load option from sync storage
	let errorReports = true;
	let enforcedDisableCrashReports = false;
	let companySettings = false;

	let options = await getObjectFromManagedStorage("DisableCrashReports");
	if (options !== undefined && options !== "undefined" && (options == "true" || options == true)) {
		errorReports = false;
		enforcedDisableCrashReports = true;
		companySettings = true;
	} else {
		options = await getObjectFromSyncStorage("DisableCrashReports");
		if (options !== undefined && options !== "undefined" && (options == "true" || options == true)) {
			errorReports = false;
		}
	}

	// Preset checkbox accordingly based by settings
	if (errorReports == "true" || errorReports == true) {
		optionToggle("crashreports", true);
	} else {
		optionToggle("crashreports", false);
		// Disable checkbox if option is forced by GPO
		if (enforcedDisableCrashReports) {
			document.querySelector("input[name=crashreports]").disabled = true;
			document.querySelector("input[name=crashreports]").style.cursor = "not-allowed";
			document.querySelector("label[for=crashreports]").style.textDecoration = "line-through";
			document.querySelector("label[for=crashreports]").style.cursor = "not-allowed";
			document.querySelector("label[for=crashreports]").style.color = "gray";
			document.querySelector(".crashreport_managed").style.display = "inline";
		}
	}

	// Listen for change events
	document.querySelector("input[name=crashreports]").addEventListener('change', (event) => {
		let stringBool = "false";
		if (!event.target.checked) {
			stringBool = "true";
		}
		errorReports = stringBool;
		chrome.storage.sync.set({ "DisableCrashReports": stringBool }, function () {
			optionToggle("crashreports", event.target.checked);
		});
	});

	// get currently used domain from managed storage
	let domain = await getObjectFromManagedStorage("Server");
	if (domain !== undefined && domain !== "undefined") {
		companySettings = true;
		api_domain = domain;
	} else {
		// get currently used domain from session storage
		domain = await getObjectFromSessionStorage("Server");
		if (domain !== undefined && domain !== "undefined") {
			api_domain = domain;
		}
	}

	// get current used encryption where data is fetched
	// fetch country of destination from upstream server
	fetch(api_protocol + '://' + api_domain + api_path + '/encryption/', {
		method: 'GET',
		//cache: 'default',
		cache: 'no-cache',
		headers: {
			'Content-Type': 'application/json'
		},
	}).then(response => response.json()).then((parsedData) => {
		document.querySelector(".secureconnection").textContent = _("options_secureconnection", [api_domain, parsedData[0], parsedData[1]]);
	}).catch((result) => {
		document.querySelector(".secureconnection").textContent = _("options_secureconnection_failed", [api_domain]);
		document.querySelector(".secureconnection").style.color = "red";
	});

	// determine if Secret or DisableServerFallback is set
	let secret = await getObjectFromManagedStorage("Secret");
	let disableServerFallback = await getObjectFromManagedStorage("DisableServerFallback");
	if (secret !== undefined && secret !== "undefined" && secret !== "" && disableServerFallback !== undefined && disableServerFallback !== "undefined" && disableServerFallback == "true") {
		companySettings = true;
	}

	// get stats if extension is managed by a company (can also be only a caching instance)
	if (companySettings) {
		document.querySelector(".companymanaged").style.display = "block";

		fetch(api_protocol + '://' + api_domain + api_path + '/flags/companymanaged', {
			method: 'GET',
			//cache: 'default',
			cache: 'no-cache',
			headers: {
				'Content-Type': 'application/json',
				'Secret': await getObjectFromManagedStorage("Secret")
			},
		}).then(response => response.json()).then((parsedData) => {
			if (parsedData.enabled == true) {
				document.querySelector(".companymanaged-text").textContent = _("options_companymanaged_fill", [parsedData.extra.company, parsedData.extra.support]);
			}
		}).catch((result) => {
			document.querySelector(".companymanaged").style.display = "none";
		});
	}
});

function optionToggle(name, state){
	if (state) {
		document.querySelector("input[name="+name+"]").checked = true;
		document.querySelector("label[for="+name+"]").textContent = _("enabled");
	} else {
		document.querySelector("input[name=" + name + "]").checked = false;
		document.querySelector("label[for=" + name + "]").textContent = _("disabled");
	}
}
