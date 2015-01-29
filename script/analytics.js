/*! uDomainFlag | Copyright 2015 Thomas Bella */
// Google Analytics
try
{
	// Check if extension has the official id and if usageData tracking is permitted
	if (typeof selfhost !== "undefined" && selfhost === chrome.i18n.getMessage("@@extension_id") && usageData === "true")
	{

		if (top.location.pathname === "/background.html")
		{
			var dynping = Math.round(((Math.random()*10)+1)*10000);
			localStorage['dynping'] = dynping;
		}

		var _gaq = _gaq || [];
		_gaq.push(['_setAccount', 'UA-42496576-1']);
		_gaq.push(['_setSessionCookieTimeout', 0]);
		_gaq.push(['_setCustomVar', 1, 'Version', chrome.app.getDetails().version, 2]);
		_gaq.push(['_trackPageview']);

		if (top.location.pathname === "/background.html")
			_gaq.push(['_trackEvent', 'Heartbeat', 'Heartbeat', 'Start', 0, true]);

		(function() {
			var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
			ga.src = 'https://www.google-analytics.com/analytics.js';
			var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
		})();


		// The plugin doesn't reload often, so I have to implent a heartbeat function
		// that sends a event every 30 minutes - 2 secounds
		var GA_HitCounter = 0;
		function GA_Heartbeat()
		{

			// Check if this is the stable build
			if (typeof selfhost == "undefined" || selfhost != chrome.i18n.getMessage("@@extension_id"))
				return false;

			if (top.location.pathname !== "/background.html")
				return false;

			// Check if an other instance is runnung.
			if (typeof localStorage['dynping'] === "undefined")
			{
				localStorage['dynping'] = dynping;
			}
			else if (dynping != localStorage['dynping'])
			{
				debug.notice("DynPing has changed. No ping");
				return false;
			}

			if (GA_HitCounter > 500)
			{
				top.location.reload();
				return;
			}
			GA_HitCounter++;
			_gaq.push(['_trackEvent', 'Heartbeat', 'Heartbeat', 'Ping', 0, true]);
			setTimeout(GA_Heartbeat, 1000 * 60 * 30 - 2);
		}

		// Check if actual page is background
		if (top.location.pathname === "/background.html")
		{
			setTimeout(GA_Heartbeat, 1000 * 60 * 30 - 2);
		}

	}
	else
	{
		debug.notice("No Google Analytics - Unstable build?");
	}
}
catch (e) {
	debug.track( e, "Error in analytics" );
}

// Track actions
function Track(category, action, label, value)
{
	if (typeof category === "undefined" || typeof action === "undefined")
		throw new Error("Number of minimum required arguments does not match.");

	if (typeof value !== "undefined")
		_gaq.push(['_trackEvent', category, action, label, value]);
	else if (typeof label !== "undefined")
		_gaq.push(['_trackEvent', category, action, label]);
	else
    	_gaq.push(['_trackEvent', category, action]);
}

// Track clicks on links
if (typeof selfhost != "undefined" && selfhost == chrome.i18n.getMessage("@@extension_id") && usageData === "true") {
	$(function(){
		$('a').click(function(){
			_gaq.push(['_trackEvent', $.trim($(this).context.innerText), 'clicked']);
		});
	});
}
