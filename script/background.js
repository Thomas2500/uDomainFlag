/*! uDomainFlag | Copyright 2015 Thomas Bella */

// get domain before request send
/*
chrome.webRequest.onBeforeRequest.addListener(function(ret)
{
	// Request data
	udf.formRequest( { tab: ret.tabId, url: ret.url, source: 1 } );
}, {
	urls: ["<all_urls>"],
	types: ["main_frame"]
});
*/

// Get ip address of domain
chrome.webRequest.onResponseStarted.addListener(function(ret)
{
	// Check if ip is available from Chrome (over local DNS request)
	var ip = 0;
	if (typeof ret.ip !== "undefined")
		ip = ret.ip;

	if (typeof ret.tabId === "undefined" || ret.tabId < 0 || ret.tabId === "")
		return;

	if (ip !== 0)
		sessionStorage[parseUrl(ret.url)] = ip;

	// udf.formRequest( { tab: ret.tabId, url: ret.url, ip: ip, source: 2 } );
	// 		###### ATTENTION ######
	// Chrome doesn't report that the request was hidden (-> entered into omnibox - pre-load website) 
	// The given tabId might be invalid and cause errors.
	//     
	// 
	// https://code.google.com/p/chromium/issues/detail?id=93646 	- Aug. 20, 2011
	// https://code.google.com/p/chromium/issues/detail?id=418193 	- Sep. 26, 2014
	// Checking, if tab id exists -> 
	chrome.tabs.get(ret.tabId, function(t)
	{
		if (chrome.runtime.lastError)
		{
			// TabId does not exist. Do nothing.
		}
		else
		{
			// Tab exists
			udf.formRequest( { tab: t.id, url: t.url, incognito: t.incognito, source: 5 } );
		}
	});
}, {
	urls: ["<all_urls>"],
	types: ["main_frame"]
});

// Fire if page is loading
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab)
{
	if(changeInfo.status == "loading")
		udf.formRequest( { tab: tabId, url: tab.url, source: 4 } );
});

// Get all opened tabs
chrome.windows.getAll({populate: true}, function(windows)
{
	for (var i = 0; i < windows.length; i++)
		for (var j = 0; j < windows[i].tabs.length; j++)
			udf.formRequest( { tab: windows[i].tabs[j].id, url: windows[i].tabs[j].url, source: 3 } );
});

// Restart extension if a new version is available (after 60 secounds)
chrome.runtime.onUpdateAvailable.addListener(function(details)
{
	if (typeof details.version != "undefined")
	{
		if (chrome.app.getDetails().version != details.version)
		{
			debug.notice("Update available");
			setTimeout(function(){  debug.notice("Reloading extension"); chrome.runtime.reload(); }, 1000 * 60);
		}
	}
	
});

// Fired if a new version was installed
chrome.runtime.onInstalled.addListener(function(details)
{
	try
	{
		if (details.reason === "update")
		{
			// Check the update was a real update
			if (details.previousVersion === chrome.app.getDetails().version)
				return false;

			if (updateNotification === "true")
			{
				// Create notification data
				var opt = {
					type: "basic",
					title: "uDomainFlag",
					message: _("updated", [ details.previousVersion, chrome.app.getDetails().version]),
					iconUrl: "images/logo-256x256.png",
					buttons: []
				}
				opt.buttons.push({title: _("about")});
				opt.buttons.push({title: _("close")});
				var uid = Math.floor((Math.random()*10000)+1);

				// Create notification
				chrome.notifications.create("udn" + uid, opt, function(retdata)
				{
					chrome.notifications.onButtonClicked.addListener(function(retdata, btnid)
					{
						// "about" clicked
						if (btnid == 0)
						{
							chrome.tabs.create({ url: "/about.html" });
						}
					});
					// Automatic close update notification after 5 minutes
					setTimeout(function(){ chrome.notifications.clear("udn" + uid, function (abc){ }); }, 1000 * 60 * 5);
				});
			}
		}
	}
	catch (e)
	{
		debug.track(e, "b:onInstalled");
	}
});

if (typeof chrome.runtime.setUninstallURL !== "undefined")
{
	chrome.runtime.setUninstallURL(data_protocol + "://" + data_domain + "/uninstall?k=" + securityKey + "&l=" + localID + "&v=" + chrome.app.getDetails().version);
}


function microtime(get_as_float) {
	//  discuss at: http://phpjs.org/functions/microtime/
	// original by: Paulo Freitas
	//   example 1: timeStamp = microtime(true);
	//   example 1: timeStamp > 1000000000 && timeStamp < 2000000000
	//   returns 1: true

	var now = new Date().getTime() / 1000;
	var s = parseInt(now, 10);

	return (get_as_float) ? now : (Math.round((now - s) * 1000) / 1000) + ' ' + s;
}




// Global functions for execution


// Storage cleanup - every 1 hour
//     Remove old entries
setInterval(function(){
	if (typeof udf !== "undefined")
	{
		udf.getDBsize(function(size)
		{
			udf.StorageCleanup();
			udf.getDBsize(function(new_size)
			{
				debug.notice("Cleared " + (parseInt(size)-parseInt(new_size)) + " bytes of data");
			});
		});
	}
}, 1000 * 60 * 60);


// Check for new updates
udf.checkUpdate();

