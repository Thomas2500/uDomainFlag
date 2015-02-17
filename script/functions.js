/*! uDomainFlag | Copyright 2015 Thomas Bella */

// Detect if a new version is installed
try
{
	if (typeof localStorage !== "undefined")
	{
		if (typeof localStorage["version"] !== "undefined" && localStorage["version"] != chrome.app.getDetails().version)
		{
			debug.notice("New Version available. Removing old storage ...");
			localStorage["clearDB"] = 1;
		}
		localStorage["version"] = chrome.app.getDetails().version;
	}
}
catch (e)
{
	debug.track(e, "c:dbVersion");
}

// Check if specific data is not available after 5 secounds of timeout
setTimeout(function(){
	if (securityKey === "" || securityKey === "undefined")
	{
		// First request for an security key
		$.post(data_protocol + "://" + data_domain + "/security", { type: "newkey" }, function(data) {
			
			// Unknown error on requesting a key. Retry after 30 secounds
			if (typeof data === "undefined" || typeof data.ok === "undefined" || parseInt(data.ok) === 0 || typeof data.securityKey === "undefined")
			{
				return setTimeout(function() { chrome.runtime.reload(); }, 1000 * 30);
			}

			securityKey = localStorage["securityKey"] = data.securityKey;
			if (typeof chrome.storage !== "undefined" && typeof chrome.storage.sync !== "undefined")
			{
				chrome.storage.sync.set({ securityKey: securityKey }, function(){ chrome.runtime.reload(); });
			}
			return;
		}, "json");
	}
	else if (securityKey === "" || securityKey === "undefined")
	{
		// Problems?
		// Using slow, limited and unsecure securityKey.
		securityKey = localStorage["securityKey"] = "d";
	}
}, 1000 * 3);

// Check if stored secuityKey is valid
setTimeout(function(){
	if (securityKey !== "" && securityKey !== "undefined")
	{
		$.post(data_protocol + "://" + data_domain + "/security", { type: "verify", key: securityKey }, function(data) {
			// Check if data is correct
			if (typeof data !== "undefined" && typeof data.ok !== "undefined")
			{
				// Check if key is valid by the server
				if (parseInt(data.valid) === 0)
				{
					// Delete securityKey and reload the extension
					delete localStorage["securityKey"];
					delete securityKey;
					chrome.storage.sync.set({ securityKey: "" }, function(){ chrome.runtime.reload(); });
				}
			}
		}, "json");
	}
}, 1000);

var db;
if (typeof localStorage["clearDB"] !== "undefined")
{
	delete localStorage["clearDB"];
	db.delete("udf");
}

db.open( {
	server: 'udf',
	version: 1,
	schema: {
		domain: {
			key: { keyPath: 'id', autoIncrement: true },
			indexes: {
				domain: { unique: true },	// example.com
				ip: { },					// Primatry IP (fetched from uDomainFlag server)
				multiip: { },				// More than 1 ip from DNS
				internal: { },				// Internal domain (e.g. 10.0.0.138)
				
				time: { },					// Time of last change/online fetch
				incognito: { },				// Incognito, delete unused/session close
				ok: { }						// Fetched without error
			}
		},

		localip: {
			key: { keyPath: 'id', autoIncrement: true },
			indexes: {
				domain: { unique: true },	// example.com
				ip: { },					// Local fetched ip (Chrome DNS)

				time: { },					// Time of last change/online fetch
				incognito: { },				// Incognito, delete unused/session close
				ok: { }						// Fetched without error
			}
		},

		ip: {
			key: { keyPath: 'id', autoIncrement: true },
			indexes: {
				ip: { unique: true },		// IP as unique index
				internal: { },				// Internal IP
				country: { },				// Destination country
				region: { },				// Destination region
				city: { },					// Destination city
				shortcountry: { },			// ISO 3166-1 alpha-2 country codes - http://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
				hostname: { },				// Hostname of the server
				
				time: { },					// Time of last change/online fetch
				incognito: { },				// Incognito, delete unused/session close
				ok: { }						// Fetched without error
			}
		},

		domaininfo: {
			key: { keyPath: 'id', autoIncrement: true },
			indexes: {
				domain: { unique: true },	// example.com
				wot: { },					// [JSON Array]
				alexa: { },					// [int] Place
				risk: { },					// [int] Risk index
				dyn: { },					// [bool] Dynamic IP with fast DNS change

				time: { },					// Time of last change/online fetch
				incognito: { },				// Incognito, delete unused/session close
				ok: { }						// Fetched without error
			}
		},

		domainsocial: {
			key: { keyPath: 'id', autoIncrement: true },
			indexes: {
				url: { unique: true },		// https://example.com/dir/file.html
				google: { },				// [int] Google +1
				facebook: { },				// [int] Facebook Likes - For url, not a created page on facebook!
				twitter: { },				// [int] Twitter Shares
				reddit: { },				// [int] Reddit ???
				
				time: { },					// Time of last change/online fetch
				incognito: { },				// Incognito, delete unused/session close
				ok: { }						// Fetched without error
			}
		}
	}
} ).then( function ( s ) {
	db = s;
	DBopen = true;
} );

if (typeof localStorage["openOptions"] !== "undefined")
{
	chrome.tabs.create({url: "chrome-extension://"+chrome.i18n.getMessage("@@extension_id")+"/options.html"});
	delete localStorage["openOptions"];
}

// Main FrameWork
// 	Parameter: [ ... ] -> optional
var udf = {
	pendingRequests: [],

	setFlag: function (data)
	{
		/*
			{ tab: obj [, risk: num][, popup: "target.html"][, title: "Title"] }
			
		*/
		try
		{
			// Check if data is correct
			if (typeof data !== "object")
				throw new Error("First argument must be an object");

			// check if tab is available
			if (typeof data.tab === "undefined")
				throw new Error("Object.tab must be specified");

			// Get/Find icon
			var icon = "images/logo-16x16.png";
			if (typeof data.icon !== "undefined" && data.icon !== "")
			{
				if (data.icon.length === 2 || data.icon === "null")
					icon = "images/flag/" + data.icon + ".png";
				else
					icon = data.icon;
			}

			// Get risk number
			var risk = 0;
			if (typeof data.risk !== "undefined")
				risk = parseInt(data.risk);

			// Get risk icon
			switch (risk)
			{
				case 1:
					risk = "images/fugue/exclamation.png";
					break;

				case 2:
					risk = "images/fugue/exclamation_red.png";
					break;

				case 0:
				default:
					risk = 0;
					break;
			}

			// No risk detected
			if (risk === 0)
			{
				chrome.pageAction.setIcon({ tabId: data.tab, path: icon });

				if (typeof data.popup !== "undefined")
					chrome.pageAction.setPopup({ tabId: data.tab, popup: data.popup });
				else
					chrome.pageAction.setPopup({ tabId: data.tab, popup: 'popup.html' });

				if (typeof data.title !== "undefined")
					chrome.pageAction.setTitle({ tabId: data.tab, title: data.title });

				return chrome.pageAction.show(data.tab);
			}

			// Risk level given, indicate it!

			var canvas = document.createElement("canvas");
			canvas.width = 19;
			canvas.height = 19;
			var ctx = canvas.getContext("2d");
			ctx.clearRect(0,0,19,19);

			var image = new Image();
			image.onload = function()
			{
				ctx.drawImage(image, Math.floor((19 - image.width)/3)-1, Math.floor((19 - image.height) / 2)-2);
				var image2 = new Image();
				image2.onload = function()
				{
					paddingx = 19-14;
					paddingy = 19-13;
					ctx.drawImage(image2, paddingx, paddingy, 14, 14);
					chrome.pageAction.setIcon({ tabId: data.tab, imageData: ctx.getImageData(0, 0, 19, 19) });
					debug.warn(runtime.lastError);

					if (typeof data.popup !== "undefined")
						chrome.pageAction.setPopup({ tabId: data.tab, popup: data.popup });
					else
						chrome.pageAction.setPopup({ tabId: data.tab, popup: 'popup.html' });

					if (typeof data.title !== "undefined")
						chrome.pageAction.setTitle({ tabId: data.tab, title: data.title });

					return chrome.pageAction.show(data.tab);
				}
				image2.src = riskicon;
			};
			image.src = icon;
		}
		catch (e)
		{
			debug.track(e, "c:setFlag");
		}
	},

	domainIPinfo: function(hostname, callback)
	{
		try
		{
			db.domain.query().filter('domain', hostname).execute().then(function(en)
			{
				if ($.isEmptyObject(en) === false)
				{
					return callback(en[0]);
				}
				
				$.post(data_protocol + "://" + data_domain + "/domain_ip.json", {key: securityKey, domain: hostname }, function(data) {
					if (typeof data === "undefined" || typeof data.ok === "undefined")
						return callback(false);

					db.domain.add({
						domain: hostname,
						ip: data.ip,
						multiip: parseInt(data.multiip),
						internal: -1,
						time: Math.round(new Date().getTime() / 1000),
						incognito: chrome.extension.inIncognitoContext,
						ok: parseInt(data.ok)
					}).then( function ( item ){
						return callback( {domain: hostname, ip: data.ip, multiip: parseInt(data.multiip), internal: -1, time: Math.round(new Date().getTime() / 1000), incognito: chrome.extension.inIncognitoContext, ok: parseInt(data.ok)} );
					});
				}, "json");
				
			});
		}
		catch (e)
		{
			return debug.track(e, "c:domainIPinfo");
		}
	},

	getLocalIP: function(hostname, ip, callback)
	{
		try
		{
			// Check if ip is stored in sessionStorage
			if (typeof ip === "undefined" || ip === "" || ip === 0 || ip === null)
				if (typeof sessionStorage[hostname] !== "undefined")
				{
					ip = sessionStorage[hostname];
					delete sessionStorage[hostname];
				}
				else
					ip = "";

			db.localip.query().filter('domain', hostname).execute().then(function(en)
			{
				if ($.isEmptyObject(en) === false)
				{
					if (typeof en[0].ip !== "undefined" || ip !== "" && en[0].ip !== ip)
						return callback(en[0]);
					else
						db.localip.remove( en[0].id ).then( function ( key ) {
							return getLocalIP(hostname, ip, callback);
						} );
					return;
				}				

				if (typeof ip !== "undefined" && ip !== "")
				{
					db.localip.add({
						domain: hostname,
						ip: ip,

						time: Math.round(new Date().getTime() / 1000),
						incognito: chrome.extension.inIncognitoContext,
						ok: 1
					}).then( function(item) {
						return callback( {domain: hostname, ip: ip, time: Math.round(new Date().getTime() / 1000), incognito: chrome.extension.inIncognitoContext, ok: 1 } );
					});
				}
				else
				{
					return callback(false);
				}
			});
		}
		catch (e)
		{
			return debug.track(e, "c:getLocalIP");
		}
	},

	getIPinfo: function(ip, callback)
	{
		try
		{
			db.ip.query().filter('ip', ip).execute().then(function(en)
			{
				if ($.isEmptyObject(en) === false)
				{
					return callback(en[0]);
				}

				$.post(data_protocol + "://" + data_domain + "/ip.json", {key: securityKey, ip: ip }, function(data)
				{
					if (typeof data === "undefined" || typeof data.ok === "undefined")
						return callback(false);

					db.ip.add({
						ip: ip,
						internal: data.internal,
						country: data.country,
						region: data.region,
						city: data.city,
						shortcountry: data.shortcountry,
						hostname: data.hostname,
						time: Math.round(new Date().getTime() / 1000),
						incognito: chrome.extension.inIncognitoContext,
						ok: parseInt(data.ok)
					}).then( function ( item ){
						return callback( {ip: data.ip, internal: -1, country: data.country, region: data.region, city: data.city, shortcountry: data.shortcountry, hostname: data.hostname, time: Math.round(new Date().getTime() / 1000), incognito: chrome.extension.inIncognitoContext, ok: parseInt(data.ok)} );
					});
				}, "json");
			});
		}
		catch (e)
		{
			return debug.track(e, "c:getIPinfo");
		}
	},

	getDomaininfo: function(hostname, callback)
	{
		try
		{
			db.domainsocial.query().filter('domain', hostname).execute().then(function(en)
			{
				if ($.isEmptyObject(en) === false)
				{
					return callback(en[0]);
				}

				$.post(data_protocol + "://" + data_domain + "/domaininfo.json", {key: securityKey, domain: hostname }, function(data) {

					if (typeof data === "undefined" || typeof data.ok === "undefined")
						return callback(false);

					db.domainsocial.add({
						domain: hostname,
						wot: JSON.stringify(data.wot),
						alexa: parseInt(data.alexa),
						risk: parseInt(data.risk),
						dyn: parseInt(data.dyn),

						time: Math.round(new Date().getTime() / 1000),
						incognito: chrome.extension.inIncognitoContext,
						ok: parseInt(data.ok)
					}).then( function ( item ){
						return callback( {domain: hostname, wot: JSON.stringify(data.wot), alexa: parseInt(data.alexa), risk: parseInt(data.risk), dyn: parseInt(data.dyn), time: Math.round(new Date().getTime() / 1000), incognito: chrome.extension.inIncognitoContext, ok: parseInt(data.ok)} );
					});
				}, "json");
			});
		}
		catch (e)
		{
			return debug.track(e, "c:getDomaininfo");
		}
	},

	getDomainSocial: function(hostname, callback)
	{
		try
		{
			db.domaininfo.query().filter('url', hostname).execute().then(function(en)
			{
				if ($.isEmptyObject(en) === false)
				{
					return callback(en);
				}

				$.post(data_protocol + "://" + data_domain + "/domainsocial.json", {key: securityKey, url: hostname }, function(data) {

					if (typeof data === "undefined" || typeof data.ok === "undefined")
						return callback(false);

					db.domaininfo.add({
						url: hostname,
						google: parseInt(data.google),
						facebook: parseInt(data.facebook),
						twitter: parseInt(data.twitter),
						reddit: parseInt(data.reddit),
						time: Math.round(new Date().getTime() / 1000),
						incognito: chrome.extension.inIncognitoContext,
						ok: parseInt(data.ok)
					}).then( function ( item ){
						return callback( {url: hostname, google: parseInt(data.google), facebook: parseInt(data.facebook), twitter: parseInt(data.twitter), reddit: parseInt(data.reddit), time: Math.round(new Date().getTime() / 1000), incognito: chrome.extension.inIncognitoContext, ok: parseInt(data.ok)} );
					});
				}, "json");
			});
		}
		catch (e)
		{
			return debug.track(e, "c:getDomainSocial");
		}
	},

	isSpecial: function(tab)
	{
		/*
			url -> string | url.url -> string
			return { icon: "images/...", title: "Title", popup: "Popup.html"} | false
		*/
		try
		{
			if (typeof tab === "object")
				var url = tab.url;
			else if (typeof tab === "string")
				var url = tab;
			else
				throw new Error("No url given");

			if (url === "")
				throw new Error("no url given");

			// Split domain
			var reg = /(chrome|chrome-extension|http|https|ftp)\:\/\/([^\/^\:^\[]{1,})/;

			if (reg.test(url))
			{
				var match = url.match(/(chrome|chrome-extension|http|https|ftp)\:\/\/([^\/^\:^\[]{1,})/);

				// Chrome extension - internal
				if (match[1] == 'chrome' || match[1] == 'chrome-extension')
					return { icon: "images/fugue/computer.png", title: "Chrome browser", popup: 'special.html' };

				// Dotless domain (mostly internal e.g. start, login, hotspot)
				if (match[2].indexOf('.') == -1)
					return { icon: "images/fugue/network.png", title: "Local domain", popup: 'internal.html' };

				// Domain with ending dot -> interpret without dot
				var tmp = match[2].match(/(.*)\.$/);
				if (tmp != null) {
					match[2] = tmp[1];
				}

				// check tld
				var domain = match[2];
				var tld = domain.match(/([^\.]*)$/);
				tld = tld[1];

				// Home networks
				if (tld == 'lan')
					return { icon: "images/fugue/home-network.png", title: "Home network", popup: 'internal.html' };

				// Local network. Can be localhost, home network or office network
				if (tld == 'local')
					return { icon: "images/fugue/network.png", title: "Local network", popup: 'internal.html' };

				// Address and Routing Parameter Area
				if (tld == 'arpa')
					return { icon: "images/fugue/network.png", title: "IP to domain network", popup: 'special.html' };

				// Company network
				if (tld == 'corp')
					return { icon: "images/fugue/network.png", title: "Local network", popup: 'internal.html' };

				// Tor network
				if (tld == 'onion' || tld == 'exit')
					return { icon: "images/special-flag/tor.png", title: "Tor network", popup: 'special.html' };
			}
			else
			{
				// Check if domain is an IPv6 address
				var reg = /\[([0-9a-fA-F\:\%]*)\]/;
				if (reg.test(url))
				{
					var match = url.match(reg);
					var domain = match[1];
				}
			}
			// Check if IP is internal
			var isinternal = this.isInternal(domain);
			if (isinternal !== false)
				return isinternal;

			return false;
		}
		catch (e)
		{
			debug.track(e, "c:isSpecial");
		}
	},

	isInternal: function(ip)
	{
		try
		{
			// IPv4 - special addresses

			// Special networks (private, RFC)
			if (ip.match(/^10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/))
				return { icon: "images/fugue/office-network.png", title: "Private network", popup: 'internal.html' };

			// Localhost
			if (ip == "127.0.0.1")
				return { icon: "images/fugue/computer.png", title: "Computer", popup: 'special.html' };

			// Localnet
			if (ip.match(/^127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/))
				return { icon: "images/fugue/computer-network.png", title: "Computer network", popup: 'special.html' };

			// Link local
			if (ip.match(/^169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/))
				return { icon: "images/fugue/computer-network.png", title: "Link local - No DHCP found", popup: 'special.html' };

			// Private - 172.16-31.XXX.XXX
			if (ip.match(/^172\.(16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/))
				return { icon: "images/fugue/network.png", title: "Private network", popup: 'internal.html' };

			// IETF protocol assignments
			if (ip.match(/^192\.0\.0\.([0-9]{1,3})$/))
				return { icon: "images/fugue/network.png", title: "IETF protocol assignments", popup: 'special.html' };

			// Documentation range
			if (ip.match(/^192\.0\.2\.([0-9]{1,3})$/))
				return { icon: "images/fugue/network.png", title: "Example range for documentation and private use", popup: 'special.html' };

			// IP 6to4 relay anycast
			if (ip.match(/^192\.88\.99\.([0-9]{1,3})$/))
				return { icon: "images/fugue/network.png", title: "IP 6to4 relay anycast", popup: 'special.html' };

			// Private - 192.168.XXX.XXX
			if (ip.match(/^192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/))
				return { icon: "images/fugue/home-network.png", title: "Private network", popup: 'internal.html' };

			// ISP - Benchmark network
			if (ip.match(/^198\.(18|19)\.([0-9]{1,3})\.([0-9]{1,3})$/))
				return { icon: "images/fugue/home-network.png", title: "Benchmark network", popup: 'special.html' };

			// Private & documantation
			if (ip.match(/^198\.51\.100\.([0-9]{1,3})$/))
				return { icon: "images/fugue/home-network.png", title: "Example range for documentation and private use", popup: 'internal.html' };

			// Private & documantation
			if (ip.match(/^203\.0\.113\.([0-9]{1,3})$/))
				return { icon: "images/fugue/home-network.png", title: "Example range for documentation and private use", popup: 'special.html' };

			// Multicast
			if (ip.match(/^224\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/))
				return { icon: "images/fugue/computer-network.png", title: "Multicast network", popup: 'special.html' };

			// Shared - SAS
			if (ip.match(/^100\.(64|65|66|67|68|69|70|71|72|73|74|75|76|77|78|79|80|81|82|83|84|85|86|87|88|89|90|91|92|93|94|95|96|97|98|99|100|101|102|103|104|105|106|107|108|109|110|111|112|113|114|115|116|117|118|119|120|121|122|123|124|125|126|127)\.([0-9]{1,3})\.([0-9]{1,3})$/))
				return { icon: "images/logo-16x16.png", title: "Shared Address Space", popup: 'special.html' };

			// IPv6 - special addresses

			// Link-Local (fe80)
			if (ip.match(/^fe80\:([0-9A-Fa-f\:\%]*)$/))
				return { icon: "images/fugue/home-network.png", title: "Private network (Link-Local)", popup: 'internal.html' };

			// 6to4
			if (ip.match(/^2002\:([0-9A-Fa-f\:\%]*)$/))
				return { icon: "images/fugue/network.png", title: "IP 6to4 network", popup: 'special.html' };

			// Localhost
			if (ip == "::1")
				return { icon: "images/fugue/computer.png", title: "Computer", popup: 'special.html' };

			return false;
		}
		catch (e)
		{
			return debug.track(e, "c:isInternal");
		}
	},

	formRequest: function(data)
	{
		try
		{
			// Check if IndexedDB is opened
			if (DBopen !== true)
				return setTimeout(function(){ udf.formRequest(data); }, 500);

			// Check if tabId is available
			if (typeof data.tab === "undefined")
				return;

			// Check source
			if (typeof data.source === "undefined")
				return;

			// Check if url is provided
			if (typeof data.url === "undefined")
				return;

			if (typeof data.incognito === "undefined")
				data.incognito = false;

			// Convert url to domain
			var domain = parseUrl(data.url);

			// If something is wrong with the domain, display a question symbol
			if (domain === false || domain === "" || domain === "false")
				return udf.setFlag({tab: data.tab, icon: "images/fugue/question-white.png", title: "No data found", popup: 'special.html'});

			// Check if local domain or local ip is requested
			var special = udf.isSpecial(data.url);
			if (special !== false)
				return udf.setFlag($.extend({}, special, data));

			var ip = "";
			if (typeof data.ip !== "undefined")
				ip = data.ip;

			udf.domainIPinfo(domain, function (domip)
			{
				if (typeof domip.ip !== "undefined" && domip.ip !== 0)
				{
					udf.getIPinfo(domip.ip, function (ipinfo)
					{
						// Check if resolved ip is special (internal, tor, ...)
						special = udf.isInternal(ipinfo.ip);
						if (special !== false)
							return udf.setFlag($.extend({}, special, data));
						else	// Domain got resolved with an ip
							udf.getLocalIP(domain, ip, function (storedinfo)
							{
								if (storedinfo !== false)
								{
									// Check if local IP is different to remote ip
									if (storedinfo.ip !== domip.ip && storedinfo.ip !== null)
									{
										// Check if local ip is a private ip
										special = udf.isInternal(storedinfo.ip);
										if (special !== false)
											return udf.setFlag($.extend({}, special, data));
									}
								}

								var title = "";

								if (typeof ipinfo.country !== "undefined")
									title += ipinfo.country + "\n";
								else
									title += ipinfo.shortcountry + "\n";

								if (typeof ipinfo.region !== "undefined")
									title += ipinfo.region + "\n";

								if (typeof ipinfo.city !== "undefined")
									title += ipinfo.city;

								return udf.setFlag($.extend({}, data, { icon: ipinfo.shortcountry.toLowerCase(), title: title }));
							});
					});
				}
				else
				{
					udf.getLocalIP(domain, ip, function (storedinfo)
					{
						if (storedinfo === false)
							return udf.setFlag($.extend({}, { icon: 'images/fugue/question-white.png', title: 'Unknown location', popup: 'special.html' }, data));
						
						special = udf.isInternal(storedinfo.ip);
						if (special !== false)
							return udf.setFlag($.extend({}, special, data));

						udf.getIPinfo(storedinfo.ip, function (ipinfo)
						{

							var title = "";
							if (typeof ipinfo.country !== "undefined")
								title += ipinfo.country + "\n";
							else
								ipinfo.shortcountry;

							if (typeof ipinfo.region !== "undefined")
								title += ipinfo.region + "\n";

							if (typeof ipinfo.city !== "undefined")
								title += ipinfo.city;

							return udf.setFlag($.extend({}, data, { icon: ipinfo.shortcountry.toLowerCase(), title: title }));
						});
					});
				}
			});

		}
		catch (e)
		{
			return debug.track(e, "c:formRequest");
		}
	},

	checkUpdate: function()
	{
		try
		{
			if (typeof selfhost == "undefined" || selfhost != chrome.i18n.getMessage("@@extension_id"))
				return;

			(function (status, details) {
				if (typeof status != "undefined")
				{
					// If Google Server is overloaded, wait 6 hours for next update request
					if (status == "throttled")
					{
						setTimeout(function(){
							udf.checkUpdate();
						}, 1000 * 60 * 60 * 6);
					}
					else // Check for Updates every 2 hours
						 // If a update is available, an other script will handle it
					{
						setTimeout(function(){
							udf.checkUpdate();
						}, 1000 * 60 * 60 * 2);
					} // status == "throttled"
					return;
				}
				// If request contains a error, retry it in 4 hours
				setTimeout(function(){
					udf.checkUpdate();
				}, 1000 * 60 * 60 * 4);
			});

		}
		catch (e)
		{
			debug.track(e, "c:checkUpdate");
		}
	},

	getDBsize: function(callback)
	{
		try
		{
			total_length = 0;
			db.domain.query().all().execute().then(function(d){						// IndexedDB - "domain"
				$.each(d, function(i, v){
					total_length += JSON.stringify(v).length;
				});
				db.ip.query().all().execute().then(function(d){						// IndexedDB - "ip"
					$.each(d, function(i, v){
						total_length += JSON.stringify(v).length;
					});
					db.domaininfo.query().all().execute().then(function(d){			// IndexedDB - "domaininfo"
						$.each(d, function(i, v){
							total_length += JSON.stringify(v).length;
						});
						db.domainsocial.query().all().execute().then(function(d){	// IndexedDB - "domainsocial"
							$.each(d, function(i, v){
								total_length += JSON.stringify(v).length;
							});
							db.localip.query().all().execute().then(function(d)		// IndexedDB - "localip"
							{
								$.each(d, function(i, v){
									total_length += JSON.stringify(v).length;
								});
								callback(total_length);
							});
						});
					});
				});
			});
		}
		catch (e)
		{
			debug.track(e, "c:getDBsize");
		}
	},

	StorageCleanup: function()
	{
		try
		{
			// Retry if database is not initialized yet
			if (typeof db === "undefined" || typeof db.open !== "undefined")
				return setTimeout(function(){ StorageCleanup(); }, 1500);

			// Check "domain" IndexedDB
			db.domain.query().all().execute().then(function(r){
				$.each(r, function(index, val) {
					var now = Math.round(new Date().getTime() / 1000);

					// Abort if val has no value or errors could occur
					if (typeof val === "undefined" || typeof val.id === "undefined" || typeof val.domain === "undefined" || typeof val.time === "undefined" || typeof val.incognito === "undefined")
						return true;

					// Check if unique key is set
					if (typeof val.domain === "undefined")
						db.domain.remove( val.id );

					// Check if entry is outdated - 1 month
					if (val.time <= now - 60 * 60 * 24 * 7 * 4)
						db.domain.remove( val.id );

					// Check if data was stored in incognito mode and is outdated - 1 hour
					if (val.incognito === "1" && val.time <= now - 60 * 60)
						db.domain.remove( val.id );
				});
			});

			// Check "ip" IndexedDB
			db.ip.query().all().execute().then(function(r){
				$.each(r, function(index, val) {
					var now = Math.round(new Date().getTime() / 1000);

					// Abort if val has no value or errors could occur
					if (typeof val === "undefined" || typeof val.ip === "undefined" || typeof val.id === "undefined" || typeof val.time === "undefined" || typeof val.incognito === "undefined")
						return true;

					// Check if unique key is set
					if (typeof val.ip === "undefined")
						db.ip.remove( val.id );

					// Check if entry is outdated - 3 months
					if (val.time <= now - 60 * 60 * 24 * 7 * 4 * 3)
						db.ip.remove( val.id );

					// Check if data was stored in incognito mode and is outdated - 1 hour
					if (val.incognito === "1" && val.time <= now - 60 * 60)
						db.ip.remove( val.id );
				});
			});

			// Check "domaininfo" IndexedDB
			db.domaininfo.query().all().execute().then(function(r){
				$.each(r, function(index, val) {
					var now = Math.round(new Date().getTime() / 1000);

					// Abort if val has no value or errors could occur
					if (typeof val === "undefined" || typeof val.domain === "undefined" || typeof val.id === "undefined" || typeof val.time === "undefined" || typeof val.incognito === "undefined")
						return true;

					// Check if unique key is set
					if (typeof val.domain === "undefined")
						db.domaininfo.remove( val.id );

					// Check if entry is outdated - 7 days
					if (val.time <= now - 60 * 60 * 24 * 7)
						db.domaininfo.remove( val.id );

					// Check if data was stored in incognito mode and is outdated - 1 hour
					if (val.incognito === "1" && val.time <= now - 60 * 60)
						db.domaininfo.remove( val.id );
				});
			});

			// Check "domainsocial" IndexedDB
			db.domainsocial.query().all().execute().then(function(r){
				$.each(r, function(index, val) {
					var now = Math.round(new Date().getTime() / 1000);

					// Abort if val has no value or errors could occur
					if (typeof val === "undefined" || typeof val.url === "undefined" || typeof val.id === "undefined" || typeof val.time === "undefined" || typeof val.incognito === "undefined")
						return true;

					// Check if unique key is set
					if (typeof val.url === "undefined")
						db.domainsocial.remove( val.id );

					// Check if entry is outdated - 3 days
					if (val.time <= now - 60 * 60 * 24 * 3)
						db.domainsocial.remove( val.id );

					// Check if data was stored in incognito mode and is outdated - 1 hour
					if (val.incognito === "1" && val.time <= now - 60 * 60)
						db.domainsocial.remove( val.id );
				});
			});

			// Add cleanup for localip
			db.localip.query().all().execute().then(function(r){
				$.each(r, function(index, val) {
					var now = Math.round(new Date().getTime() / 1000);

					// Abort if val has no value or errors could occur
					if (typeof val === "undefined" || typeof val.domain === "undefined" || typeof val.id === "undefined" || typeof val.time === "undefined" || typeof val.incognito === "undefined")
						return true;

					// Check if unique key is set
					if (typeof val.domain === "undefined")
						db.localip.remove( val.id );

					// Check if entry is outdated - 1 day
					if (val.time <= now - 60 * 60 * 24)
						db.localip.remove( val.id );

					// Check if data was stored in incognito mode and is outdated - 5 minutes
					if (val.incognito === "1" && val.time <= now - 60 * 5)
						db.localip.remove( val.id );
				});
			});

		}
		catch (e)
		{
			error.track(e, "c:StorageCleanup");
		}
	},

	isServerInMaintenanceMode: function(callback)
	{
		try
		{
			$.get(data_protocol + "://" + data_domain + "/status.json", function(data) {
				if (typeof data === "undefined" || typeof data.ok === "undefined")
					return callback(false);
				return callback(data);
			}, "json");
		}
		catch (e)
		{
			return debug.track(e, "c:isServerInMaintenanceMode");
		}
	},
}

// Simple internationalization 
function _(variable, object)
{
	var lang = variable;
	if (typeof object === "undefined")
		lang = chrome.i18n.getMessage(variable).replace(/\n/g,"<br />");
	else
		lang = chrome.i18n.getMessage(variable, object).replace(/\n/g,"<br />");

	if (lang.length == 0)
	{
		debug.warn("Language variable \"" + variable + "\" not found. Please help us improving your language!");
		lang = "#>>"+variable+"<< unknown#";
	}

	return lang;
}

function number_format (number, decimals, dec_point, thousands_sep) {
  // discuss at: http://phpjs.org/functions/number_format/
  number = (number + '')
    .replace(/[^0-9+\-Ee.]/g, '');
  var n = !isFinite(+number) ? 0 : +number,
    prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
    sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
    dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
    s = '',
    toFixedFix = function(n, prec) {
      var k = Math.pow(10, prec);
      return '' + (Math.round(n * k) / k)
        .toFixed(prec);
    };
  // Fix for IE parseFloat(0.55).toFixed(0) = 0;
  s = (prec ? toFixedFix(n, prec) : '' + Math.round(n))
    .split('.');
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
  }
  if ((s[1] || '')
    .length < prec) {
    s[1] = s[1] || '';
    s[1] += new Array(prec - s[1].length + 1)
      .join('0');
  }
  return s.join(dec);
}

function parseUrl(url)
{
	var match = url.match(/(chrome|chrome-extension|http|https|ftp)\:\/\/([^\/^\:^\[]{1,})/);
	if (match == null)
	{
		match = url.match(/\[([^\.]{3,})\]/);
		if (match == null)
			return false;
		return match[1];
	}
	var tmp = match[2].match(/(.*)\.$/);
	if (tmp != null) {
		match[2] = tmp[1];
	}
	return match[2];
}

/**
 * Function: getWoTid
 *
 * Get the id of a WoT percentage
 *
 * Parameters:
 *
 *   wot - [mixed/WoTData]
 *
 * Returns: string (number)
 *
 *   return imageid of WoT
 */
function getWoTid( wot, index ) {
	try {
		if (typeof wot[index] == "undefined") {
			var wotimg = "0";
		} else {
			if (parseInt(wot[index]) >= 80) {
				var wotimg = "5";
			} else if (parseInt(wot[index]) >= 60) {
				var wotimg = "4";
			} else if (parseInt(wot[index]) >= 40) {
				var wotimg = "3";
			} else if (parseInt(wot[index]) >= 20) {
				var wotimg = "2";
			} else if (parseInt(wot[index]) >= 0) {
				var wotimg = "1";
			} else {
				var wotimg = "0";
			}
		}
		return wotimg;
	}
	catch (e) {
		return 0;
	}
}

function getDateObject()
{
	var now = new Date();
	return { day: now.getDate(), month: now.getMonth(), year: now.getFullYear()};
}
