/*! uDomainFlag | Copyright 2015 Thomas Bella */

// Get the current tab id
var getCurrentTab = function (callback) {
	chrome.tabs.query({
		windowId: chrome.windows.WINDOW_ID_CURRENT,
		active: true
	}, function(tabs) {
		callback(tabs[0]);
	});
};

// Load data if ressources are loaded
$(function(){
	getCurrentTab(function(data){
		return writePopup(data);
	});
});

var ip = "";

function writePopup(tab)
{
	// Check if IndexedDB is open
	if (typeof db === "undefined" || typeof db.open !== "undefined")
	{
		// Delaying start to initiate database 
		setTimeout(function(){ writePopup(tab); }, 100);
		return false;
	}

	try
	{
		var now = Math.round(new Date().getTime() / 1000);

		var domain = parseUrl(tab.url);

		if (domain === false || domain === "" || domain === "false")
			return self.location.href = "special.html";

		udf.getLocalIP(domain, null, function (localip)
		{
			if (typeof localip === "undefined")
			{
				$(".name").text(_("unknown"));
				$(".name").removeClass("loader");
				$(".ip").text(_("unknown"));
				$(".ip").removeClass("loader");
				return;
			}

			var internal = udf.isInternal(localip.ip);
			$(".name").text(internal.title);
			$(".name").removeClass("loader");
			$(".ip").text(localip.ip);
			$(".ip").removeClass("loader");
		});
	}
	catch (e)
	{
		debug.track(e, "i:writePopup");
	}
}