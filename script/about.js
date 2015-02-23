/*! uDomainFlag | Copyright 2015 Thomas Bella */
$(document).ready(function()
{
	$.get(data_protocol + '://' + data_domain + "/donations", function (data)
	{
		$("#donated").text(_("donated", [ data.count, data.amount ]));

		if (data.count < 1)
			return;

		var html = "";
		$.each(data.donations, function (i, v)
		{
			html += '<div class="item">';
			html += '<div class="title">' + i + ' - ' + v.amount + ' &euro;<br /><small>' + v.date + '</small></div>';
			html += '<div class="option">' + v.message + '</div>';
			html += '<div class="clear"></div></div>';
		});
		$(".donaters").html(html);

	}, "json");

	// My age
	todayDate = new Date();
	todayYear = todayDate.getFullYear();
	todayMonth = todayDate.getMonth();
	todayDay = todayDate.getDate();
	age = todayYear - 1994; 

	if (todayMonth < 5 - 1)
	{
		age--;
	}

	if (5 - 1 == todayMonth && todayDay < 5)
	{
		age--;
	}
	$("#aboutme").html(_("aboutme", [ age ]));

	$(".yv").html(_("your_version", [chrome.app.getDetails().version]));

	$("title").html($("title").text() + " &bull; uDomainFlag");

	$(".spoiler .title").click(function (){
		$(".spoiler .content").slideToggle("fast");
	});

	// Get releases from github
	$.get("https://api.github.com/repos/Thomas2500/uDomainFlag/releases", function (data)
	{
		$.each(data, function (i, v)
		{
			var date = v.published_at.split('T');
			date = date[0].split('-');

			var html = "<div class=\"item\">";
			html += "<div class=\"title\"><span class=\"v\"><a href=\""+v.html_url+"\">"+v.tag_name+"</a></span><br />"+date[2]+"."+date[1]+"."+date[0]+"</div>";
			html += "<div class=\"option\">";

			var lines = v.body.match(/[^\r\n]+/g);
			var ul = 0;

			$.each(lines, function (i2, l)
			{
				// Check if unordert list is used
				if (l.substring(0, 2) === "- ")
				{
					if (ul == 0)
					{
						html += "<ul>";
						ul = 1;
					}

					html += "<li>" + l.replace("- ", "").trim() + "</li>";
				}
				else if (ul == 1)
				{
					html += "</ul>";
					ul = 0;
				}
			});
			if (ul == 1)
				html += "</ul>";

			html += "</div>";
			html += "<div class=\"clear line\"></div>";
			html += "</div>";

			$(".autochangelog").append(html);
		});
	}, "json");
});