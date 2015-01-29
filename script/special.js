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
		var match = tab.url.match(/(.*)\:\/\/([^\/^\:^\[]{1,})/);

		if (match !== null)
		{
			var protocol = match[1].toLowerCase();
			var domain = match[2].toLowerCase();
		}
		else
		{
			if (tab.url.substring(0, 4) == "file")
				var protocol = "file";
		}

		var title = "";
		var information = "";

		if (protocol === "http" || protocol === "https" || protocol === "file" || protocol === "ftp" || protocol === "news")
		{
			title = _("unknown");
			information = _("domain_unknown");
		}
		else if (protocol === "chrome")
		{
			title = _("chrome_ressource");
			information = _("local_ressource");
		}
		else if (protocol === "chrome-extension")
		{
			title = _("chrome_extension");
			information = _("local_ressource");
		}


		$(".title").text(title);
		$(".information").html(information);
	}
	catch (e)
	{
		debug.track(e, "s:writePopup");
	}
}