/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

window.addEventListener('load', function () {
	document.querySelectorAll('[load-lang]').forEach(function(value){
		value.textContent = _(value.getAttribute("load-lang"));
	});
});
