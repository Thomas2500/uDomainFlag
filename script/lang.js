/*! uDomainFlag | Copyright 2015 Thomas Bella */
$(function(){

	// Fill text into html()
	$("[load-lang]").each(function()
	{
		var adj = Object();
		for (var i = 1; i < 10; i++)
		{
			var lf = $(this).attr('lang-func' + i);
			if (typeof lf === "undefined" || lf === "")
				break;
			adj.push(lf());
		}
		$(this).html(_(this.getAttribute("load-lang"), adj));
	});

	// Fill text into placeholder
	$("[load-lang-placeholder]").each(function(){
		$(this).attr("placeholder", _(this.getAttribute("load-lang-placeholder")));
	});

	// Fill text into value of input
	$("[load-lang-value]").each(function(){
		$(this).val(_(this.getAttribute("load-lang-value")));
	});

	$("[load-special]").each(function(){
		if (this.getAttribute("load-special") == "developer-age")
		{
			todayDate = new Date();
			todayYear = todayDate.getFullYear();
			todayMonth = todayDate.getMonth();
			todayDay = todayDate.getDate();
			age = todayYear - 1994;

			if (todayMonth < 5 - 1)
				age--;
			if (5 - 1 == todayMonth && todayDay < 5)
				age--;
			$(this).html(String(age));
		}
	});
});
