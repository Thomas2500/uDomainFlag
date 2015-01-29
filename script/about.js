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



	$("title").html($("title").text() + " &bull; uDomainFlag");
});