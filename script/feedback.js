/*! uDomainFlag | Copyright 2015 Thomas Bella */
$(function(){

	$("#singlebutton").click(function(){
		$.post(data_protocol + "://" + data_domain + "/feedback", { data: JSON.stringify($("form").serializeArray()), key: securityKey }, function(data){
			$("form").find("input, textarea").val("");
			$("form").slideUp("slow", function(){
				$("form").css("text-align", "center");
				$("form").html(_("feedback_thankyou"));
				$("form").slideDown('slow');
			});
		});
		return false;
	});

});
