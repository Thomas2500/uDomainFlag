/*! uDomainFlag | Copyright 2015 Thomas Bella */
$(document).ready(function()
{
	$.get(data_protocol + '://' + data_domain + "/donations", function (data) {
		$("#donated").text(_("donated", [ data.count, data.amount ]));

		if (data.count < 1) {
			return;
		}

		var base = $(document.createElement("div"));
		$.each(data.donations, function (i, v) {
			var euro = parseFloat(v.amount);

			var elem = $(document.createElement("div")).attr("class", "item");
			elem.append($(document.createElement("div")).addClass("title"));
			elem.find(".title").append($(document.createElement("span")).addClass("name").text(i));
			elem.find(".title").append($(document.createElement("br")));
			elem.find(".title").append($(document.createElement("small")).addClass("money").html(euro + " &euro;"));
			elem.find(".title").append($(document.createElement("span")).text(" - "));
			elem.find(".title").append($(document.createElement("small")).addClass("date").text(v.date));
			elem.append($(document.createElement("div")).addClass("option").text(v.message));
			elem.append($(document.createElement("div")).addClass("clear"));

			base.append(elem.wrapAll(document.createElement("div")).parent().html());
		});
		$(".donators").append(base);
	}, "json");

	// My age
	todayDate = new Date();
	todayYear = todayDate.getFullYear();
	todayMonth = todayDate.getMonth();
	todayDay = todayDate.getDate();
	age = todayYear - 1994; 

	if (todayMonth < 5 - 1) {
		age--;
	}

	if (5 - 1 == todayMonth && todayDay < 5) {
		age--;
	}
	$("#aboutme").html(_("aboutme", [ age ]));

	$(".yv").html(_("your_version", [chrome.app.getDetails().version]));

	$("title").html($("title").text() + " &bull; uDomainFlag");

	$(".spoiler .title").click(function (){
		$(".spoiler .content").slideToggle("fast");
	});

	// Get releases and changelog
	$.get(data_protocol + '://' + data_domain + "/changelog", function (data) {
		$.each(data, function (i, v) {

			var elem = $(document.createElement("div")).addClass("item");
			elem.append($(document.createElement("div")).addClass("title"));
			elem.find(".title").append($(document.createElement("span")).addClass("v"));
			elem.find("span.v").append($(document.createElement("a")).attr("href", v.url).text(v.version));
			elem.find(".title").append($(document.createElement("br")));
			elem.find(".title").append($(document.createElement("span")).addClass("releasedate").text(v.releasedate));

			var base = $(document.createElement("div"));

			var lines = v.description.match(/[^\r\n]+/g);
			var end_of_block = String(Math.random());
			lines.push(end_of_block);
			var ul = null;

			$.each(lines, function (i2, l) {
				// Convert line to string, if it is not already a string
				if (typeof l !== "string") {
					l = String(l);
				}

				l = l.trim();

				// Check if unordered list is used
				if (l.substring(0, 2) === "- ") {
					// Start unordered list if not created
					if (ul == null) {
						ul = $(document.createElement("ul"));
					}
					$(ul).append($(document.createElement("li")).text(l.replace("- ", "")));
				} else if (ul != null) { // Check if unorderd list was active
					base.append(ul.wrapAll(document.createElement("div")).parent().html());
					ul = null;
				}

				// Cancel output
				if (end_of_block == l) {
					return true;
				}

				if (ul == null) {
					base.append($(document.createElement("div")).text(l));
				}
			});
			elem.append($(document.createElement("div")).addClass("option").html(base));
			elem.append($(document.createElement("div")).addClass("clear").addClass("line"));

			$(".autochangelog").append(elem.wrapAll(document.createElement("div")).parent().html());
		});
	}, "json");
});
