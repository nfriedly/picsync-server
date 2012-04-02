FB.init({
  appId      : '269779016437813', // App ID
  channelUrl : '//' + document.domain + '/fb_xd_channel.html', // Channel File
  status     : true, // check login status
  cookie     : true, // enable cookies to allow the server to access the session
  xfbml      : false  // parse XFBML
});

$("div.pictures img").click(function() {
	// https://developers.facebook.com/docs/reference/dialogs/feed/
	FB.ui({
		method: 'feed'
		,picture: 'http:' + $(this).attr('src') // should this be "source"? 
		,actions: [{name: "via PicSync", link: "http://picsyncapp.com"}]
	});
});