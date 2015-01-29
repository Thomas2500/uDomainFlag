/*! uDomainFlag | Copyright 2015 Thomas Bella */

var debug = {
	message: [],
	problem: 0,	// 0 -> no problem, 1 -> notice, 2 -> warn, 3 -> error

	// Notices
	notice: function (message) {
		if (loglevel < 3)
			return;
		this.msgpush(message, "notice");
		this.problem = 1;
	},

	// Logs
	log: function (message) {
		if (loglevel < 4)
			return;
		this.msgpush(message, "log");
	},

	// Errors
	error: function (message) {
		this.msgpush(message, "error");
		this.problem = 3;
	},

	// Debug information
	debug: function(message) {
		if (loglevel < 4)
			return;
		this.msgpush(message, "debug");
	},

	// Info
	info: function(message) {
		if (loglevel < 2)
			return;
		this.msgpush(message, "info");
	},

	// Warnings
	warn: function (message) {
		if (loglevel < 1)
			return;
		this.msgpush(message, "warn");
		this.problem = 2;
	},

	// Clears local messages
	clear: function() {
		this.message = [];
		this.notice("Error log cleared");
		this.problem = 0;
	},

	// Content block from catch statement
	track: function(error, notice) {
		if (typeof notice === "undefined")
			notice = "";

		this.msgpush( error.message, "catch", error.stack, notice);
		this.problem = 3;
	},

	// Sends local messages to the developer
	send: function()
	{
		if (errorReports !== "true") // Awww, I'm now a little bit sad. I can't improve my program :-(
			return this.clear();

		// Set securityKey to an empty string, if it is not available
		if (typeof securityKey === "undefined")
			securityKey = "";

		// Clear history, if extension is not provided by the correct package
		if (typeof selfhost === "undefined" || selfhost !== chrome.i18n.getMessage("@@extension_id"))
			return;

		// Check if log contains data
		if ($.isEmptyObject(this.message))
			return;

		// Send error to developer
		$.post(data_protocol + "://" + data_domain + "/error.json", { log: this.message.serializeArray(), key: securityKey, version: chrome.app.getDetails().version }, function(data)
		{
			this.clear();
		});
	},

	/* INTERNAL */

	msgpush: function(data, type, stack, note)
	{
		// Create timestanp (mysql UTC_TIMESTAMP)
		var d = new Date();
		var date = ""

		// Year
		date += d.getUTCFullYear();
		date += "-";

		// Month
		if (d.getUTCMonth()+1 < 10)
			date += "0";
		date += d.getUTCMonth()+1;
		date += "-";

		// Day
		if (d.getUTCDate() < 10)
			date += "0";
		date += d.getUTCDate();
		date += " ";

		// Hour
		if (d.getUTCHours() < 10)
			date += "0";
		date += d.getUTCHours();
		date += ":";

		// Minutes
		if (d.getUTCMinutes() < 10)
			date += "0";
		date += d.getUTCMinutes();
		date += ":";

		// Secounds
		if (d.getUTCSeconds() < 10)
			date += "0";
		date += d.getUTCSeconds();
		date += ".";

		// Millisecounds
		date += d.getUTCMilliseconds();


		// Check if stack is available. If not, generate one
		if (typeof stack === "undefined" || stack.trim() === "" || stack === null)
		{
			// Backtrace
			var err = new Error();
			var stack = [];

			// Remove unused lines
			$.each(err.stack.split('\n'), function(d, a)
			{
				if (d <= 2)		// Line 0: "Error", Line 1: "msgpush", Line 2: "debug.xxxxx"
					return true;
				stack.push(a.replace("at ", "").trim());
			});
		}

		// Check if a note is available
		if (typeof note === "undefined")
			note = "";

		this.message.push({ time: date, log: data, type: type, stack: stack });

		if (this.problem >= 2)
			this.send();
	}
}
