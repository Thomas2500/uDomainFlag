/*! uDomainFlag | Copyright 2015 Thomas Bella */
function init()
{
	if (typeof db.open !== "undefined")
		return setTimeout(function(){ init(); }, 200);

	$("title").html($("title").text() + " &bull; uDomainFlag");

	udf.getDBsize(function (size)
	{
		var sdb = "";
		if (size > 1000*1000)
			sdb = number_format(size/(1000*1000), 2) + " MB";
		else if (size > 1000)
			sdb = number_format(size/1000, 2) + " KB";
		else
			sdb = size + " Bytes";

		$("div[load-lang=cache_desc]").html(_("cache_desc", [sdb] ));
	});

	$("#securitykey").val(securityKey);

	// error reports
	if (errorReports === "true")
	{
		$("#error_report").attr('checked', true);
		$("#error_report_yn").text(_("yes"));
	}

	// update notification
	if (updateNotification === "true")
	{
		$("#update").attr('checked', true);
		$("#update_yn").text(_("yes"));
	}

	// social data
	if (socialData === "true")
	{
		$("#socialdata").attr('checked', true);
		$("#socialdata_yn").text(_("yes"));
	}

	// popup
	if (popupWebsite === "true")
	{
		$("#popup").attr('checked', true);
		$("#popup_yn").text(_("yes"));
	}

};

$(document).ready(function()
{

	$("#clear_cache").click(function()
	{
		localStorage["clearDB"] = 1;
		localStorage["openOptions"] = 1;
		chrome.runtime.reload();
	});
	$("#restart").click(function()
	{
		localStorage["openOptions"] = 1;
		chrome.runtime.reload();
	});

	$("#securitykey").focus(function(){
		this.select();
	});

	$("input[type=checkbox]").change(function()
	{
		var status = "";
		if ($(this).is(':checked'))
		{
			$("#" + $(this).attr("id") + "_yn").text(_("yes"));
			status = "true";
		}
		else
		{
			$("#" + $(this).attr("id") + "_yn").text(_("no"));
			status = "false";
		}

		var varname = $(this).attr("id");

		if (varname == "update")
			varname = "updateNotification";
		else if (varname == "socialdata")
			varname = "socialData";
		else if (varname == "popup")
			varname = "popupWebsite";
		else if (varname == "error_report")
			varname = "errorReports";
		else
			return;

		// Write change to all variables
		window[varname] = status;
		localStorage[varname] = status;

		// push change to chrome sync
		var obj = Object();
		obj[varname] = status;
		chrome.storage.sync.set(obj);
	});




	init();
});
