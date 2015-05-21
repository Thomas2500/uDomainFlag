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
		var domain = parseUrl(tab.url);

		if (domain === false || domain === "" || domain === "false")
			return self.location.href = "special.html";

		// Reportlink
		$('.reportlink').append('<a href="#"><img src="/images/svg/warning.svg" alt="!" /> ' + _("report_risk") + '</a>')
		$(".reportlink a").attr('hidden-weburl', tab.url);

		$(".reportlink a").click(function (){
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
				appendForm('url', $(".reportlink a").attr("hidden-weburl"));
				appendForm('image', image);

				console.log(form);

				url += encodeURIComponent(form.outerHTML);
				url += encodeURIComponent("Please wait.<br />Redirecting you to " + lookup_domain + " ...");
				url += encodeURIComponent('<script>document.forms[0].submit();</script>');
				chrome.tabs.create({ url: url });
			});
		});

		// Infolink
		$('.infolink').append('<a target="_blank" href="' + lookup_protocol + '://' + lookup_domain + '/l/' + domain + '"><img src="/images/svg/info.svg" alt="i" /> ' + _("more_info") + '</a>');

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
			$(".special").show();
			udf.getDomainSocial(tab.url, function (social)
			{
				// Google +1
				if (typeof social.google === "undefined")
					$(".google").html("<span class=\"sccontent\">0</span>" + " +1");
				else
					$(".google").html("<span class=\"sccontent\">" + number_format(social.google, 0, null, " ") + "</span> +1");
				$(".google").removeClass("loader");

				// Facebook likes
				if (typeof social.facebook === "undefined")
					$(".facebook").html("<span class=\"sccontent\">" + "0</span> " + _("likes"));
				else if (social.facebook === 1)
					$(".facebook").html("<span class=\"sccontent\">" + "1</span> " + _("like"));
				else
					$(".facebook").html("<span class=\"sccontent\">" + number_format(social.facebook, 0, null, " ") + "</span> " + _("likes"));
				$(".facebook").removeClass("loader");

				// Twitter tweets
				if (typeof social.twitter === "undefined")
					$(".twitter").html("<span class=\"sccontent\">" + "0</span> " + _("tweets"));
				else if (social.twitter === 1)
					$(".twitter").html("<span class=\"sccontent\">" + "1</span> " + _("tweet"));
				else
					$(".twitter").html("<span class=\"sccontent\">" + number_format(social.twitter, 0, null, " ") + "</span> " + _("tweets"));
				$(".twitter").removeClass("loader");

				// Reddit ?shares?
				if (typeof social.reddit === "undefined")
					$(".reddit").html("<span class=\"sccontent\">" + "0</span>");
				else
					$(".reddit").html("<span class=\"sccontent\">" + number_format(social.reddit, 0, null, " ") + "</span>");
				$(".reddit").removeClass("loader");
			});
		}

		udf.getDomaininfo(domain, function (dominfo)
		{
			// Web Of Trust - WoT
			var wot = $.parseJSON(dominfo.wot);
			if (!$.isEmptyObject(wot))
			{
				var wotimg = getWoTid(wot, 0);
				if (wotimg != "0")
				{
					if (typeof wot[0] !== "undefined")
					{
						var percent = parseInt(wot[0]);
						var wotimg = getWoTid(wot, 0);
						$('.we1').text(percent + "%");
						if (wotimg == 5)
							$('.we1').css('color', '#4CAF50');
						else if (wotimg == 4)
							$('.we1').css('color', '#68E36D');
						else if (wotimg == 3)
							$('.we1').css('color', '#FFA000');
						else if (wotimg == 2)
							$('.we1').css('color', '#E64A19');
						else if (wotimg == 1)
							$('.we1').css('color', '#FF0000');
						else
							$('.we1').css('color', '#999999');
						$('.we1').removeClass("loader");
					}

					if (typeof wot[1] !== "undefined")
					{
						var percent = parseInt(wot[1]);
						var wotimg = getWoTid(wot, 1);
						$('.we2').text(percent + "%");
						if (wotimg == 5)
							$('.we2').css('color', '#4CAF50');
						else if (wotimg == 4)
							$('.we2').css('color', '#68E36D');
						else if (wotimg == 3)
							$('.we2').css('color', '#FFA000');
						else if (wotimg == 2)
							$('.we2').css('color', '#E64A19');
						else if (wotimg == 1)
							$('.we2').css('color', '#FF0000');
						else
							$('.we2').css('color', '#999999');
						$('.we2').removeClass("loader");
					}

					if (typeof wot[2] != "undefined")
					{
						var percent = parseInt(wot[2]);
						var wotimg = getWoTid(wot, 2);
						$('.we3').text(percent + "%");
						console.log(wotimg);
						if (wotimg == 5)
							$('.we3').css('color', '#4CAF50');
						else if (wotimg == 4)
							$('.we3').css('color', '#68E36D');
						else if (wotimg == 3)
							$('.we3').css('color', '#FFA000');
						else if (wotimg == 2)
							$('.we3').css('color', '#E64A19');
						else if (wotimg == 1)
							$('.we3').css('color', '#FF0000');
						else
							$('.we3').css('color', '#999999');
						$('.we3').removeClass("loader");
					}

					if (typeof wot[4] != "undefined")
					{
						var percent = parseInt(wot[4]);
						var wotimg = getWoTid(wot, 4);
						$('.we4').text(percent + "%");
						if (wotimg == 5)
							$('.we4').css('color', '#4CAF50');
						else if (wotimg == 4)
							$('.we4').css('color', '#68E36D');
						else if (wotimg == 3)
							$('.we4').css('color', '#FFA000');
						else if (wotimg == 2)
							$('.we4').css('color', '#E64A19');
						else if (wotimg == 1)
							$('.we4').css('color', '#FF0000');
						else
							$('.we4').css('color', '#999999');
						$('.we4').removeClass("loader");
					}
				}
				else
				{
					$('.wotblock').hide();
				}
			}
			else
			{
				$('.wotblock').hide();
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
				if (dominfo.risk == 2)
				{
					$(".container").removeClass("greenbox");
					$(".container").addClass("redbox");

					// IF REASON FOUND, WRITE INTO .reason AND MAKE .warning display TO table FROM none.
				}
			}
		});
	}
	catch (e)
	{
		debug.track(e, "p:writePopup");
	}
}

$(function() {
	$('.wotclickable').click(function() {
		if ($('.wotex').hasClass("active"))
		{
			$('.wotc').slideUp('slow');
			$('.wotex').removeClass("active");
		}
		else
		{
			$('.wotc').slideDown('slow');
			$('.wotex').addClass("active");
		}
	});
});
