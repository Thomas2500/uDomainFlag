/*! uDomainFlag | Copyright 2015 Thomas Bella */

/*
Requires:
	parameter
	jquery
*/

var eudt = {

	base: {
		// Base data to avoid duplicates
		"key": securityKey,
		"lid": localID,

		// Send version for a defragmentation statistic
		"version": chrome.app.getDetails().version,
	},

	track: {

		// Event - Track an event like a click on a internal link or updating the extension 
		event: function (category, action, label, value)
		{
			if (typeof category === "undefined" || typeof action === "undefined")
				throw new Error("Number of minimum required arguments does not match.");

			if (typeof label === "undefined")
				label = "";

			if (typeof value === "undefined")
				value = "";

			var dt = {
				"type": "event",
				"category": category,
				"action": action,
				"label": label,
				"value": value
			};
			eudt.track.send(dt);
		},

		// Send event to the Server
		send: function (data)
		{
			var now = new Date();

			var dt = { 
				"data": data,

				"hour": now.getHours(),
				"minute": now.getMinutes(),
				"secound": now.getSeconds()
			};

			$.post(data_protocol + "://" + data_domain + "/track", $.extend({}, eudt.base, dt), function (data) { });
		}
	},

	// Send "ping" to receive a "pong"
	ping: function ()
	{
		if (top.location.pathname !== "/background.html")
			return false;

		$.post(data_protocol + "://" + data_domain + "/ping", eudt.base, function (data)
		{
			// Check if everything was correct
			if (data === "pong")
				return true;
		}, "text");
	},

	user: function ()
	{
		if (top.location.pathname !== "/background.html")
			return false;

		var now = new Date();
		var dt = {
			"type": "user",

			// User-language to expand language support
			"language": navigator.language,
			// Timezone to obtain local time
			"timezone": new Date().getTimezoneOffset(),
			// User's platform 
			"platform": navigator.platform,

			// Time
			"hour": now.getHours(),
			"minute": now.getMinutes(),
			"secound": now.getSeconds()
		};

		$.post(data_protocol + "://" + data_domain + "/track", $.extend({}, eudt.base, dt), function (data)
		{ });
	}

};

// Only track if extension id matches.
if (typeof selfhost !== "undefined" && selfhost === chrome.i18n.getMessage("@@extension_id") && usageData === "true")
{
	// Initial information submit
	eudt.user();
	eudt.ping();

	// Ping every 15 minutes
	setInterval( function() { eudt.ping(); }, 1000 * 60 * 15);
}
