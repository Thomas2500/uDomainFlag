/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

window.addEventListener('load', function () {
	writeContent();
});

async function writeContent(){
	let currentDomain = await getAPIDomain();
	if (currentDomain != api_domain_primary && currentDomain != api_domain_fallback) {
		document.querySelector('.companymanaged').style.display = "inline";
	}
	document.querySelector('.offline_description').innerHTML = _("offline_description", [currentDomain]);
}
