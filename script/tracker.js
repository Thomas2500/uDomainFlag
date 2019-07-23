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

	responseTime: function(run) {
		var start_t = new Date().getTime();

		// uDomainFlag primary server
		$.post('https://udfdata.unterhaltungsbox.com/empty', { sample: Math.random() }, function() {
			var end_t_o = new Date().getTime();
			var diff = end_t_o - start_t;
			$.post('https://udfdata.unterhaltungsbox.com/speed', { type: "orca", run: run, diff: diff }, function() {});
		});

		// uDomainFlag server over CloudFlare proxy - test if traffic can be reduced (eg. response times)
		$.post('https://udfdata.bella.gq/empty', { sample: Math.random() }, function() {
			var end_t_c = new Date().getTime();
			var diff = end_t_c - start_t;
			$.post('https://udfdata.unterhaltungsbox.com/speed', { type: "proxy", run: run, diff: diff }, function() {});
		});
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
if (typeof checkSelfhost === "function" && checkSelfhost() && usageData === "true")
{
	// Initial information submit
	eudt.user();
	eudt.ping();

	// Ping every 15 minutes
	setInterval( function() { eudt.ping(); }, 1000 * 60 * 15);
}
