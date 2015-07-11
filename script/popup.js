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
		if (localStorage["popupOpenWebsite"] !== "true") {
			return writePopup(data);
		} else {
			// Open informations at domainflag.unterhaltungsbox.com
			chrome.tabs.create({ url: lookup_protocol + "://" + lookup_domain + "/l/" + parseUrl(data.url) });
			return;
		}
	});
});

var ip = "";

function writePopup(tab) {
	// Check if IndexedDB is open
	if (typeof db === "undefined" || typeof db.open !== "undefined") {
		// Delaying start to initiate database 
		setTimeout(function(){ writePopup(tab); }, 100);
		return false;
	}

	try {
		if (typeof tab.incognito !== "undefined" && tab.incognito == true) {
			var inc = true;
		} else {
			var inc = false;
		}

		var now = Math.round(new Date().getTime() / 1000);
		var domain = parseUrl(tab.url);

		if (domain === false || domain === "" || domain === "false") {
			return self.location.href = "special.html";
		}

		// Reportlink
		$('.reportlink').append('<a href="#"><img src="/images/svg/warning.svg" alt="!" /> ' + _("report_risk") + '</a>')
		$(".reportlink a").attr('hidden-weburl', tab.url);

		$(".reportlink a").click(function (){
			// Create screenshot of the "bad" website if user wants to report it
			chrome.tabs.captureVisibleTab(null, { format: "png" }, function (image) {
				// Set data context
				var encContent = 'data:text/html;charset=utf8,';

				// create form
				var form = document.createElement('form');
				form.method = 'POST';
				form.action = lookup_protocol + '://' + lookup_domain + '/riskreport';
				var base = $(form);

				function appendForm(key, value) {
					base.append($(document.createElement("input")).attr("type", "hidden").attr("name", key).val(value));
				}

				// Adding data to form
				appendForm('key', localStorage["securityKey"]);
				appendForm('url', $(".reportlink a").attr("hidden-weburl"));
				appendForm('image', image);

				// the form is not longer the base element, create a div
				base = base.wrapAll(document.createElement("div")).parent();

				// Create nice notification
				base.append($(document.createTextNode("Please wait a moment.")));
				base.append($(document.createElement("br")));
				base.append($(document.createTextNode("Redirecting you to " + lookup_domain + " ...")));

				// Submit form
				var script = document.createElement("script");
				script.type = "text/javascript";
				script.text = "document.forms[0].submit();";
				base.append($(script));

				// Encode to url
				encContent += encodeURIComponent(base.html());

				// Create tab with form data as url
				chrome.tabs.create({ url: encContent });
			});
		});

		// Infolink
		$('.infolink').append('<a target="_blank" href="' + lookup_protocol + '://' + lookup_domain + '/l/' + domain + '"><img src="/images/svg/info.svg" alt="i" /> ' + _("more_info") + '</a>');

		udf.domainIPinfo(domain, function (dii)	{
			// IP, fetched from server
			if (dii.ip === 0) {
				$(".ip").text(_("unknown"));
			} else {
				$(".ip").text(dii.ip);
			}
			$(".ip").removeClass("loader");
			
			// DNS contains multiple IPs
			if (dii.multiip !== 0) {
				$(".multiip").slideDown('fast');
			}

			// Difference local ip / remote ip
			if ($(".localip").text().trim() !== "" && $(".localip").text().trim() !== dii.ip)
				$(".localipdisplay").slideDown('fast');

			// Color the box to match warning
			if (dii.risk == 1) {
				$(".container").removeClass("greenbox");
				$(".container").addClass("graybox");
			} else if (dii.risk == 2) {
				$(".container").removeClass("greenbox");
				$(".container").addClass("yellowbox");
			} else if (dii.risk == 3) {
				$(".container").removeClass("greenbox");
				$(".container").addClass("redbox");
			}

			// Display warning message
			var msg;
			switch (dii.risktype) {
				case 0:
					msg = "possible spam";
					break;
				case 1:
					msg = "phishing";
					break;
				case 2:
					msg = "malware";
					break;
				case 3:
					msg = "botnet Command\nand Control";
					break;
				case 4:
					msg = "spam redirect";
				case 5:
				default:
					msg = "";
			}
			if (typeof msg !== "undefined" && msg.length > 0) {
				// Only one space
				if (msg.indexOf(" ") !== -1 && msg.indexOf(" ", msg.indexOf(" ") + 1) === -1) {
					msg = msg.replace(" ", "<br />");
				} else if (msg.indexOf("\n") !== -1) {
					msg = msg.replace("\n", "<br />");
				}
				$(".reason").html(msg.toUpperCase());
				$(".warning").slideDown('fast');
			}
		}, { incognito: inc });

		udf.getLocalIP(domain, null, function (localip) {
			// Get local ip, fetched from client
			if (localip.ip === 0 || localip.ip === null) {
				$(".localip").text(_("unknown"));
			} else {
				$(".localip").text(localip.ip);
			}
			$(".localip").removeClass("loader");

			// Difference local ip / remote ip
			if ($(".ip").text().trim() !== "" && $(".ip").text().trim() !== localip.ip) {
				$(".localipdisplay").slideDown('fast');
			}

			if (typeof localip.ip === "undefined") {
				udf.domainIPinfo(domain, function (dii) {
					udf.getIPinfo(dii.ip, function (ipinfo) {
						// Hostname
						if (ipinfo.hostname === ""){
							$(".host").text(_("unknown"));
						} else {
							$(".host").text(ipinfo.hostname);
						}
						$(".host").removeClass("loader");

						// Country
						if (typeof ipinfo.country === "undefined" || ipinfo.country === ""){
							$(".country").text(_("unknown"));
						} else {
							$(".country").text(ipinfo.country);
						}
						$(".country").removeClass("loader");

						// Region and City
						var tx = "";
						if (typeof ipinfo.region !== "undefined" || ipinfo.region !== "") {
							tx = ipinfo.region;
						}

						if (typeof ipinfo.city !== "undefined" || ipinfo.city !== "") {
							if (tx === "") {
								tx = ipinfo.city;
							} else if (tx !== ipinfo.city) {
								tx += ", " + ipinfo.city;
							}
						}

						if (tx === "") {
							$(".country2").text(_("unknown"));
						} else {
							$(".country2").text(tx);
						}
						$(".country2").removeClass("loader");
					}, { incognito: inc });
				}, { incognito: inc });
			} else {
				domip = localip.ip;
			}

			udf.getIPinfo(domip, function (ipinfo) {
				// Hostname
				if (ipinfo.hostname === "") {
					$(".host").text(_("unknown"));
				} else {
					$(".host").text(ipinfo.hostname);
				}
				$(".host").removeClass("loader");

				// Country
				if (typeof ipinfo.country === "undefined" || ipinfo.country === "") {
					$(".country").text(_("unknown"));
				} else {
					$(".country").text(ipinfo.country);
				}
				$(".country").removeClass("loader");

				// Region and City
				var tx = "";
				if (typeof ipinfo.region !== "undefined" || ipinfo.region !== "") {
					tx = ipinfo.region;
				}

				if (typeof ipinfo.city !== "undefined" || ipinfo.city !== "") {
					if (tx === "") {
						tx = ipinfo.city;
					} else if (tx !== ipinfo.city) {
						tx += ", " + ipinfo.city;
					}
				}

				if (tx === "") {
					$(".country2").text(_("unknown"));
				} else {
					$(".country2").text(tx);
				}
				$(".country2").removeClass("loader");
			}, { incognito: inc });

		}, { incognito: inc });

		if (socialData !== "false") {
			$(".special").show();
			udf.getDomainSocial(tab.url, function (social) {
				// Google +1
				if (typeof social.google === "undefined") {
					$(".google").html("<span class=\"sccontent\">0</span>" + " +1");
				} else {
					$(".google").html("<span class=\"sccontent\">" + number_format(social.google, 0, null, " ") + "</span> +1");
				}
				$(".google").removeClass("loader");

				// Facebook likes
				if (typeof social.facebook === "undefined") {
					$(".facebook").html("<span class=\"sccontent\">" + "0</span> " + _("likes"));
				} else if (social.facebook === 1) {
					$(".facebook").html("<span class=\"sccontent\">" + "1</span> " + _("like"));
				} else {
					$(".facebook").html("<span class=\"sccontent\">" + number_format(social.facebook, 0, null, " ") + "</span> " + _("likes"));
				}
				$(".facebook").removeClass("loader");

				// Twitter tweets
				if (typeof social.twitter === "undefined") {
					$(".twitter").html("<span class=\"sccontent\">" + "0</span> " + _("tweets"));
				} else if (social.twitter === 1) {
					$(".twitter").html("<span class=\"sccontent\">" + "1</span> " + _("tweet"));
				} else {
					$(".twitter").html("<span class=\"sccontent\">" + number_format(social.twitter, 0, null, " ") + "</span> " + _("tweets"));
				}
				$(".twitter").removeClass("loader");

				// Reddit ?shares?
				if (typeof social.reddit === "undefined") {
					$(".reddit").html("<span class=\"sccontent\">" + "0</span>");
				} else {
					$(".reddit").html("<span class=\"sccontent\">" + number_format(social.reddit, 0, null, " ") + "</span>");
				}
				$(".reddit").removeClass("loader");
			}, { incognito: inc });
		}

		udf.getDomaininfo(domain, function (dominfo) {
			// Web Of Trust - WoT
			var wot = $.parseJSON(dominfo.wot);
			if (!$.isEmptyObject(wot)) {
				var wotimg = getWoTid(wot, 0);
				if (wotimg != "0") {
					if (typeof wot[0] !== "undefined") {
						var percent = parseInt(wot[0]);
						var wotimg = getWoTid(wot, 0);
						$('.we1').text(percent + "%");
						if (wotimg == 5) {
							$('.we1').css('color', '#4CAF50');
						} else if (wotimg == 4) {
							$('.we1').css('color', '#68E36D');
						} else if (wotimg == 3) {
							$('.we1').css('color', '#FFA000');
						} else if (wotimg == 2) {
							$('.we1').css('color', '#E64A19');
						} else if (wotimg == 1) {
							$('.we1').css('color', '#FF0000');
						} else {
							$('.we1').css('color', '#999999');
						}
						$('.we1').removeClass("loader");
					} else {
						$('.we1').text(_("unknown"));
						$('.we1').removeClass("loader");
					}

					if (typeof wot[1] !== "undefined") {
						var percent = parseInt(wot[1]);
						var wotimg = getWoTid(wot, 1);
						$('.we2').text(percent + "%");
						if (wotimg == 5) {
							$('.we2').css('color', '#4CAF50');
						} else if (wotimg == 4) {
							$('.we2').css('color', '#68E36D');
						} else if (wotimg == 3) {
							$('.we2').css('color', '#FFA000');
						} else if (wotimg == 2) {
							$('.we2').css('color', '#E64A19');
						} else if (wotimg == 1) {
							$('.we2').css('color', '#FF0000');
						} else {
							$('.we2').css('color', '#999999');
						}
						$('.we2').removeClass("loader");
					} else {
						$('.we2').text(_("unknown"));
						$('.we2').removeClass("loader");
					}

					if (typeof wot[2] != "undefined") {
						var percent = parseInt(wot[2]);
						var wotimg = getWoTid(wot, 2);
						$('.we3').text(percent + "%");
						if (wotimg == 5) {
							$('.we3').css('color', '#4CAF50');
						} else if (wotimg == 4) {
							$('.we3').css('color', '#68E36D');
						} else if (wotimg == 3) {
							$('.we3').css('color', '#FFA000');
						} else if (wotimg == 2) {
							$('.we3').css('color', '#E64A19');
						} else if (wotimg == 1) {
							$('.we3').css('color', '#FF0000');
						} else {
							$('.we3').css('color', '#999999');
						}
						$('.we3').removeClass("loader");
					} else {
						$('.we3').text(_("unknown"));
						$('.we3').removeClass("loader");
					}

					if (typeof wot[4] != "undefined") {
						var percent = parseInt(wot[4]);
						var wotimg = getWoTid(wot, 4);
						$('.we4').text(percent + "%");
						if (wotimg == 5) {
							$('.we4').css('color', '#4CAF50');
						} else if (wotimg == 4) {
							$('.we4').css('color', '#68E36D');
						} else if (wotimg == 3) {
							$('.we4').css('color', '#FFA000');
						} else if (wotimg == 2) {
							$('.we4').css('color', '#E64A19');
						} else if (wotimg == 1) {
							$('.we4').css('color', '#FF0000');
						} else {
							$('.we4').css('color', '#999999');
						}
						$('.we4').removeClass("loader");
					} else {
						$('.we4').text(_("unknown"));
						$('.we4').removeClass("loader");
					}
				} else {
					$('.wotblock').hide();
				}
			} else {
				$('.wotblock').hide();
			}
			
			// Is an dynamic/private ip?
			if (dominfo.dyn !== 0) {
				$(".dynamicip").slideDown('fast');
			}
		}, { incognito: inc });
	}
	catch (e) {
		debug.track(e, "p:writePopup");
	}
}

$(function() {
	$('.wotclickable').click(function() {
		if ($('.wotex').hasClass("active")) {
			$('.wotc').slideUp('slow');
			$('.wotex').removeClass("active");
		} else {
			$('.wotc').slideDown('slow');
			$('.wotex').addClass("active");
		}
	});
});
