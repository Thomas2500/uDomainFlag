"use strict";

window.addEventListener('load', function () {
	document.querySelector(".yourversion").textContent = _("options_yourversion", [extensionVersion, chrome.i18n.getMessage("@@extension_id")]);
	document.querySelector(".crash-intro").textContent = _("options_crashreports");
	document.querySelector(".crash-desc").textContent = _("options_crashreports_why");
	document.querySelector(".versionhistory").textContent = _("options_versionhistory");
	document.querySelector(".howitworks_intro").textContent = _("options_howitworks");

	document.querySelector(".links [name=privacy]").textContent = _("options_privacypolicy");
	document.querySelector(".links [name=imprint]").textContent = _("options_imprint");

	if (errorReports == "true") {
		optionToggle("crashreports", true);
	} else {
		optionToggle("crashreports", false);
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
			let resp = JSON.parse(this.response);
			document.querySelector(".secureconnection").textContent = _("options_secureconnection", [api_domain, resp[0], resp[1]]);
		}
	};
	request.send();
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
