/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

window.addEventListener('load', function () {
	document.querySelector(".yourversion").textContent = _("options_yourversion", [extensionVersion, chrome.i18n.getMessage("@@extension_id")]);

	// Preset checkbox accordingly based by settings
	if (errorReports == "true") {
		optionToggle("crashreports", true);
	} else {
		optionToggle("crashreports", false);
		// Disable checkbox if option is forced by GPO
		if (localStorage["policyDisableCrashReports"] == "true") {
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
		let stringBool = "true";
		if (event.target.checked == false) {
			stringBool = "false";
		}
		errorReports = localStorage["errorReports"] = stringBool;
		chrome.storage.sync.set({ "errorReports": stringBool }, function () {
			optionToggle("crashreports", event.target.checked);
		});
	});

	// get current used encryption where data is fetched
	let request = new XMLHttpRequest();
	request.open('GET', api_protocol + '://' + api_domain + api_path + '/encryption/', true);
	request.onload = function () {
		if (this.status == 200) {
			let parsedData;
			try {
				parsedData = JSON.parse(this.response);
			}
			catch (e) {
				document.querySelector(".secureconnection").textContent = _("options_secureconnection_failed", [api_domain]);
				document.querySelector(".secureconnection").style.color = "red";
				let status = this.status;
				let response = this.response;
				Sentry.withScope(function (scope) {
					scope.setExtra("domain", domain);
					scope.setExtra("status", status);
					scope.setExtra("response", response);
					Sentry.captureException(e);
				});
				return
			}
			document.querySelector(".secureconnection").textContent = _("options_secureconnection", [api_domain, parsedData[0], parsedData[1]]);
		}
	};
	request.onerror = function(){
		document.querySelector(".secureconnection").textContent = _("options_secureconnection_failed", [api_domain]);
		document.querySelector(".secureconnection").style.color = "red";
	}
	request.send();

	// get stats if extension is managed by a company (can also be only a caching instance)
	// TODO: Settings can be set without standalone/caching instance
	if (companySettings) {
		document.querySelector(".companymanaged").style.display = "block";
		let request2 = new XMLHttpRequest();
		request2.open('GET', api_protocol + '://' + api_domain + api_path + '/flags/companymanaged', true);
		// Provide secret as header if provided by configuration
		if (localStorage["policySecret"] != "") {
			request2.setRequestHeader("Secret", localStorage["policySecret"]);
		}

		request2.onload = function () {
			if (this.status == 200) {
				let parsedData;
				try {
					parsedData = JSON.parse(this.response);
				}
				catch (e) {
					let status = this.status;
					let response = this.response;
					Sentry.withScope(function (scope) {
						scope.setExtra("flag", "companymanaged");
						scope.setExtra("status", status);
						scope.setExtra("response", response);
						Sentry.captureException(e);
					});
				}
				if (parsedData.enabled == true) {
					document.querySelector(".companymanaged-text").textContent = _("options_companymanaged_fill", [parsedData.extra.company, parsedData.extra.support]);
				}
			}
		};
		request2.send();
	} else {
		document.querySelector(".companymanaged").style.display = "none";
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
