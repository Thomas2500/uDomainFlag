/*! uDomainFlag | Copyright 2020 Thomas Bella */
"use strict";

window.addEventListener('load', function () {
	document.querySelectorAll('[load-lang]').forEach(function(value){
		value.textContent = _(value.getAttribute("load-lang"));
	});
});
