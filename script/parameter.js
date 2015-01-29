/*! uDomainFlag | Copyright 2015 Thomas Bella */

// Extension related stuff
var selfhost 	  = "eklbfdpploakpkdakoielobggbhemlnm";		// Unique ID of this extension
var data_domain   = "udfdata.unterhaltungsbox.com";			// Domain which gets the data
var data_protocol =	"http";									// Protocol to use (http|https)
var lookup_domain = "domainflag.unterhaltungsbox.com";
var lookup_protocol = "http";

var backup_domain = data_domain;							// Secound domain, if first is offline | TODO: create secound domain with other server

// Security related stuff
var securityKey   = (typeof localStorage["securityKey"] !== "undefined") ? localStorage["securityKey"] : "";			// Security Key

// Development related stuff
var errorReports  = (typeof localStorage["errorReports"] !== "undefined") ? localStorage["errorReports"] : "true";	// Send error reports?
var usageData	  = (typeof localStorage["usageData"] !== "undefined") ? localStorage["usageData"] : "true";		// Analyse data with Google Analytics

var loglevel	  = (typeof localStorage["loglevel"] !== "undefined") ? parseInt(localStorage["loglevel"]) : 1;		// Loglevel
	// 0 => Only error
	// 1 => 0 & warning
	// 2 => 1 & info
	// 3 => 2 & notice
	// 4 => 3 & debug

// User choise
var popupWebsite  		= (typeof localStorage["popupWebsite"] !== "undefined") ? localStorage["popupWebsite"] : "false"; 				// Open information as new window/tab
var updateNotification  = (typeof localStorage["updateNotification"] !== "undefined") ? localStorage["updateNotification"] : "false"; 	// Nofification after plugin update
var updateNotificationB = (typeof localStorage["updateNotificationB"] !== "undefined") ? localStorage["updateNotificationB"] : "true"; 	// Nofification after plugin update with big changes
var socialData	  		= (typeof localStorage["socialData"] !== "undefined") ? localStorage["socialData"] : "false";					// Display socialData? (Google +1, Facebook likes, ...)
var usageData			= "true"; 																										// Will be an opt-out option in the future

var DBopen = false;

var remSync = false;
setTimeout(function(){ remSync = true; }, 1000 * 3); // Set remSync to true after 3 secounds -> we need a new security key

// Get data from global Google sync
if (typeof chrome.storage !== "undefined" && typeof chrome.storage.sync !== "undefined")
{
	chrome.storage.sync.get(["securityKey", "popupWebsite", "socialData", "updateNotification", "updateNotificationB"], function(ret) {
		if (!$.isEmptyObject(ret))
		{
			if (typeof ret.securityKey !== "undefined")
				securityKey = localStorage["securityKey"] = ret.securityKey;

			if (typeof ret.popupWebsite !== "undefined")
				popupWebsite = localStorage["popupWebsite"] = ret.popupWebsite;

			if (typeof ret.socialData !== "undefined")
				socialData = localStorage["socialData"] = ret.socialData;

			if (typeof ret.updateNotification !== "undefined")
				updateNotification = localStorage["updateNotification"] = ret.updateNotification;

			if (typeof ret.updateNotificationB !== "undefined")
				updateNotificationB = localStorage["updateNotificationB"] = ret.updateNotificationB;
		}
		remSync = true;
	});
}
else
	debug.notice("Chrome.storage is not available!");

// Set loglevel to maximum, if extension doesn't have the right id
if (typeof selfhost === "undefined" || selfhost !== chrome.i18n.getMessage("@@extension_id"))
{
	loglevel = localStorage["loglevel"] = 4;
}
