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
		if (localStorage["popupOpenWebsite"] !== "true")
			return writePopup(data);
		else
		{
			// Open informations at domainflag.unterhaltungsbox.com
			chrome.tabs.create({ url: lookup_protocol + "://" + lookup_domain + "/l/" + parseUrl(data.url) });
			return;
		}
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

		$("#report_button").attr('weburl', tab.url);
		var domain = parseUrl(tab.url);

		if (domain === false || domain === "" || domain === "false")
			return self.location.href = "special.html";

		// Alexa Link
		$('#anl').html('<a target="_blank" href="http://www.alexa.com/siteinfo/' + domain + '">' + $.trim($('#anl').html())+'</a>');

		// Info
		$('.links').append('<a target="_blank" href="' + lookup_protocol + '://' + lookup_domain + '/l/' + domain + '">' + _("more_info") + '</a>');

		// WoT
		$('#wotl').html('<a href="https://www.mywot.com/en/scorecard/' + domain + '" target="_blank"> ' + $('#wotl').html() + "</a>");

		udf.domainIPinfo(domain, function (dii)
		{
			// IP, fetched from server
			if (dii.ip === 0)
				$(".ip").text(_("unknown"));
			else
				$(".ip").text(dii.ip);
			$(".ip").removeClass("loader");
			
			// DNS contains multiple IPs
			if (dii.multiip !== 0)
				$(".multiip").slideDown('fast');

			// Difference local ip / remote ip
			if ($(".localip").text().trim() !== "" && $(".localip").text().trim() !== dii.ip)
				$(".localipdisplay").slideDown('fast');
		});

		udf.getLocalIP(domain, null, function (localip)
		{
			// Get local ip, fetched from client
			if (localip.ip === 0 || localip.ip === null)
				$(".localip").text(_("unknown"));
			else
				$(".localip").text(localip.ip);
			$(".localip").removeClass("loader");

			// Difference local ip / remote ip
			if ($(".ip").text().trim() !== "" && $(".ip").text().trim() !== localip.ip)
				$(".localipdisplay").slideDown('fast');

			if (typeof localip.ip === "undefined")
			{
				udf.domainIPinfo(domain, function (dii)
				{
					udf.getIPinfo(dii.ip, function (ipinfo)
					{
						// Hostname
						if (ipinfo.hostname === "")
							$(".host").text(_("unknown"));
						else
							$(".host").text(ipinfo.hostname);
						$(".host").removeClass("loader");

						// Country
						if (typeof ipinfo.country === "undefined" || ipinfo.country === "")
							$(".country").text(_("unknown"));
						else
							$(".country").text(ipinfo.country);
						$(".country").removeClass("loader");

						// Region and City
						var tx = "";
						if (typeof ipinfo.region !== "undefined" || ipinfo.region !== "")
							tx = ipinfo.region;

						if (typeof ipinfo.city !== "undefined" || ipinfo.city !== "")
							if (tx === "")
								tx = ipinfo.city;
							else if (tx !== ipinfo.city)
								tx += ", " + ipinfo.city;

						if (tx === "")
							$(".country2").text(_("unknown"));
						else
							$(".country2").text(tx);
						$(".country2").removeClass("loader");
					});
				});
			}
			else
				domip = localip.ip;

			udf.getIPinfo(domip, function (ipinfo)
			{
				// Hostname
				if (ipinfo.hostname === "")
					$(".host").text(_("unknown"));
				else
					$(".host").text(ipinfo.hostname);
				$(".host").removeClass("loader");

				// Country
				if (typeof ipinfo.country === "undefined" || ipinfo.country === "")
					$(".country").text(_("unknown"));
				else
					$(".country").text(ipinfo.country);
				$(".country").removeClass("loader");

				// Region and City
				var tx = "";
				if (typeof ipinfo.region !== "undefined" || ipinfo.region !== "")
					tx = ipinfo.region;

				if (typeof ipinfo.city !== "undefined" || ipinfo.city !== "")
					if (tx === "")
						tx = ipinfo.city;
					else if (tx !== ipinfo.city)
						tx += ", " + ipinfo.city;

				if (tx === "")
					$(".country2").text(_("unknown"));
				else
					$(".country2").text(tx);
				$(".country2").removeClass("loader");
			});

		});


		if (socialData !== "false")
		{
			$(".spcial").show();
			udf.getDomainSocial(tab.url, function (social)
			{
				// Google +1
				if (typeof social.google === "undefined")
					$(".google").text("0" + " +1's");
				else if (social.google === 1)
					$(".google").text("1" + " +1's");
				else
					$(".google").text(number_format(social.google, 0, null, " ") + " +1's");
				$(".google").removeClass("loader");

				// Facebook likes
				if (typeof social.facebook === "undefined")
					$(".facebook").text("0 " + _("likes"));
				else if (social.facebook === 1)
					$(".facebook").text("1 " + _("like"));
				else
					$(".facebook").text(number_format(social.facebook, 0, null, " ") + " " + _("likes"));
				$(".facebook").removeClass("loader");

				// Twitter tweets
				if (typeof social.twitter === "undefined")
					$(".twitter").text("0 " + _("tweets"));
				else if (social.twitter === 1)
					$(".twitter").text("0 " + _("tweet"));
				else
					$(".twitter").text(number_format(social.twitter, 0, null, " ") + " " + _("tweets"));
				$(".twitter").removeClass("loader");

				// Reddit ?shares?
				if (typeof social.reddit === "undefined")
					$(".reddit").text("0");
				else
					$(".reddit").text(number_format(social.reddit, 0, null, " "));
				$(".reddit").removeClass("loader");
			});
		}

		udf.getDomaininfo(domain, function (dominfo)
		{
			// Alexa page rank
			if (parseInt(dominfo.alexa) == -1)
				$(".alexa").text(_("alexa_noindex"));
			else
				$(".alexa").text(number_format(parseInt(dominfo.alexa), 0, '', ' '));
			$(".alexa").removeClass("loader");

			// Web Of Trust - WoT
			var wot = $.parseJSON(dominfo.wot);
			if (!$.isEmptyObject(wot))
			{
				// WoT
				$('#wotl').html("<a href=\"https://www.mywot.com/en/scorecard/" + domain + "\" target=\"_blank\"> " + $('#wotl').html() + "</a>");


				var wotimg = getWoTid(wot, 0);
				$('.wot').html("<img src=\"/images/wot/"+wotimg+".png\" title=\"" + _("wotmessage" + wotimg) + "\" alt=\"\" />");

				if (wotimg != "0")
				{
					if (typeof wot[0] !== "undefined")
					{
						var percent = parseInt(wot[0]);
						$('#trust_1').text(_("trustworthiness"));
						var wotimg = getWoTid(wot, 0);
						$('#trust_2').html("<img src=\"/images/wot/"+wotimg+".png\" style=\"width: 16px; height: 16px;\" title=\"" + _("wotmessage" + wotimg) + "\" alt=\"\" />");
						$('#trust_3').text(percent + "%");
					}

					if (typeof wot[1] !== "undefined")
					{
						var percent = parseInt(wot[1]);
						$('#vendor_1').html(_("vendor"));
						var wotimg = getWoTid(wot, 1);
						$('#vendor_2').html("<img src=\"/images/wot/" + wotimg + ".png\" style=\"width: 16px; height: 16px;\" title=\"" + _("wotmessage" + wotimg) + "\" alt=\"\" />");
						$('#vendor_3').text(percent + "%");
					}

					if (typeof wot[2] != "undefined")
					{
						var percent = parseInt(wot[2]);
						$('#privacy_1').html(_("privacy"));
						var wotimg = getWoTid(wot, 2);
						$('#privacy_2').html("<img src=\"/images/wot/" + wotimg + ".png\" style=\"width: 16px; height: 16px;\" title=\"" + _("wotmessage" + wotimg) + "\" alt=\"\" />");
						$('#privacy_3').text(percent + "%");
					}

					if (typeof wot[4] != "undefined")
					{
						var percent = parseInt(wot[4]);
						$('#child_1').html(_("child"));
						var wotimg = getWoTid(wot, 4);
						$('#child_2').html("<img src=\"/images/wot/" + wotimg + ".png\" style=\"width: 16px; height: 16px;\" title=\"" + _("wotmessage" + wotimg) + "\" alt=\"\" />");
						$('#child_3').text(percent + "%");
					}
				} else {
					$('.wotex').hide();
				}
			}
			
			// Is an dynamic/private ip?
			if (dominfo.dyn !== 0)
				$(".dynamicip").slideDown('fast');

			// Risk -> near future
			if (dominfo.risk !== 0)
			{
				/*
				-1 	-> Good
				0 	-> Nothing / No data
				1 	-> Warning
				2 	-> Bad
				*/
				// class "w_msg"
			}
		});
	}
	catch (e)
	{
		debug.track(e, "p:writePopup");
	}
}

$(function() {
	$('.wotex').click(function() {
		if ($('.wotexpanded').is(":hidden")) {
			$('.wotexpanded').slideDown('slow');
			$('.wotex').html("<img src=\"/images/reduce.png\" alt=\"+\" />");
		} else {
			$('.wotexpanded').slideUp('slow');
			$('.wotex').html("<img src=\"/images/expand.png\" alt=\"+\" />");
		}
	});

	$("#report_button").click(function (){
		chrome.tabs.captureVisibleTab(null, { format: "png" }, function (image) {
			// Set data context
			var url = 'data:text/html;charset=utf8,';

			// create form
			var form = document.createElement('form');
			form.method = 'POST';
			form.action = lookup_protocol + '://' + lookup_domain + '/riskreport';

			function appendForm(key, value) {
				var input = document.createElement('input');
				input.setAttribute("type", "hidden");
				input.setAttribute('name', key);
				input.setAttribute('value', value);
				form.appendChild(input);
			}

			// Adding data to form
			appendForm('key', localStorage["securityKey"]);
			appendForm('url', $(this).attr("weburl"));
			appendForm('image', image);

			url += encodeURIComponent(form.outerHTML);
			url += encodeURIComponent("Redirecting to " + lookup_domain + " ...");
			url += encodeURIComponent('<script>document.forms[0].submit();</script>');
			chrome.tabs.create({ url: url });
		});
	});

	$(".reload").click(function(){
		self.location.reload();
	});
});
