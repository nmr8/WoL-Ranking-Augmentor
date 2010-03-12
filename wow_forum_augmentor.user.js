// ==UserScript==
// @name           WoW Forum Augmentor
// @namespace      WFA
// @description    Enhances World of Warcraft NA/EU forums with WoW Progress scores
// @include        http://forums.worldofwarcraft.com/*
// @include        http://forums.wow-europe.com/*
// ==/UserScript==



WFA =
{
	worldThreshold: 100,
	localThreshold: 100,
	realmThreshold: 3,
	MAX_LEGENDARY: 3,
	MAX_EPIC: 25,
	MAX_RARE: 500,
	COLOR_LEGENDARY:"#FF8000",
	COLOR_EPIC: "#A335EE",
	COLOR_RARE: "#0070DD",
	COLOR_COMMON: '',
	IS_REQUESTING: 1,
	FAILED_REQUEST: 2,
	ignoredPostOpacity: 0.45,
	applyIgnoredPostOpacity: true,
	applyColorPostBorder: false,
	maxEntryAge: 86400,
	maxCacheAge: 86400,
	rankCache:{},
	getForumArea: function()
	{
		var area = '';
		var url = document.location;
		if( String(url).match( /forums\.wow-europe\.com/ ) )
		{
			area = 'EU';	
		}
		else if( String(url).match( /forums\.worldofwarcraft\.com/ ) )
		{
			area = 'US';
		}
		return area;
	},
	generateGuildRealmKey: function( area, realm, guild )
	{
		return String(area + "_" + realm + "_" + guild).toLowerCase();
	},
	getGuildRankInfo: function( area, realm, guildName, post )
	{
		if( guildName && realm )
		{
			var key = WFA.generateGuildRealmKey( area, realm, guildName );
			//not cached or cache is old
			if( !WFA.rankCache[key] || ((new Date()) - WFA.rankCache[key].timestamp) > WFA.maxEntryAge )
			{
				WFA.requestRank( area, realm, guildName, post );
				return WFA.IS_REQUESTING;
			}
			return WFA.rankCache[key].value;
		}
		else
		{
			return null;	
		}
	},
	cleanGuildName: function( guildName )
	{
		return guildName.replace( /(^\s*&lt;\s*|\s*&gt;$)/g, '' );
	},
	cleanRealmName: function( realmName )
	{
		return realmName.replace( /(^\s*|\s*$)/g, '' );
	},
	stylePost: function( post, rankInfo )
	{
		if( WFA.applyIgnoredPostOpacity )
		{
			if( !rankInfo || (rankInfo.world > WFA.worldThreshold && rank.info && rankInfo.local > WFA.localThreshold && rankInfo.realm > WFA.realmThreshold ) )
			{
				post.style.opacity = WFA.ignoredPostOpacity;
			}
		}
	},
	requestRank: function( area, realm, guild, post, onRequest )
	{
		var key = WFA.generateGuildRealmKey( area, realm, guild );
		area = area.replace( /'/g, '-' ).replace( /\s/g, "+").toLowerCase();;
		realm = realm.replace( /'/g, '-' ).replace( /\s/g, "-").toLowerCase();
		guild = guild.replace( /'/g, '-' ).replace( /\s/g, "+");
		var requestUrl = 'http://www.wowprogress.com/guild/'+area+'/'+realm+'/'+guild+'/json_rank';

		GM_xmlhttpRequest(
		{
			method: 'GET',
			url: requestUrl,
			headers: 
			{
				'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey',
				'Accept': 'text/html,text/javascript,text/json',
			},
			onload: function(responseDetails)
			{
				
				var responseObj = WFA.FAILED_REQUEST;
				
				if( responseDetails.responseText )
				{
					eval( "responseObj = " + responseDetails.responseText );
				}
				
				if( !responseObj )
				{
					responseObj = WFA.FAILED_REQUEST;	
				}
				
				WFA.rankCache[key] = {value: responseObj, timestamp:(new Date()).getTime() };
				WFA.processPost( area, realm, guild, post );
				
			}
		});	
		
	},
	getGuildNode: function( post )
	{
		var guildNode = document.evaluate( ".//li[@class='icon-guild']/small/b/a", post,null, XPathResult.ANY_TYPE, null );
		return guildNode.iterateNext();
	},
	getRealmNode: function( post )
	{
		var realmNode = document.evaluate( ".//li[@class='icon-realm']/small/b", post, null, XPathResult.ANY_TYPE, null );
		return realmNode.iterateNext();
	},
	getBorderElement: function( post )
	{
		var element = document.evaluate( ".//div[@class='innerborder']", post, null, XPathResult.ANY_TYPE, null );
		return element.iterateNext();
	},
	isBluePost: function( post )
	{
		var isBlue = false;
		var element = document.evaluate( ".//span[@class='blue']", post, null, XPathResult.ANY_TYPE, null );
		element = element.iterateNext();
		if( element )
		{
			isBlue = true;
		}
		return isBlue;
	},
	getRankColor: function( rank )
	{
		if( rank <= WFA.MAX_LEGENDARY )
		{
			return WFA.COLOR_LEGENDARY;
		}
		else if( rank <= WFA.MAX_EPIC )
		{
			return WFA.COLOR_EPIC;
		}
		else if( rank <= WFA.MAX_RARE )
			return WFA.COLOR_RARE;
		else
		{
			return "#1EFF00"
		}
		
	},
	buildRankText: function( info )
	{
		var world = WFA.getRankColor( info.word_rank );
		var area = WFA.getRankColor( info.area_rank );
		var areaText = WFA.getForumArea();
		return 'World: <span style="color:'+world+'">' + info.world_rank + '<span><BR>'+areaText+': <span style="color:'+area+'>' + info.area_rank + '</span>';
		
	},
	processPost: function( area, realm, guild, post )
	{
		if( WFA.isBluePost( post ) )
		{
			var innerBorderElement = WFA.getBorderElement( post );
			innerBorderElement.style.borderColor = "#00C0FF";
		}
		else
		{
			var guildRankInfo = WFA.getGuildRankInfo( area, realm, guild, post );
			if( guildRankInfo && guildRankInfo != WFA.IS_REQUESTING && guildRankInfo.score )
			{
				var realmNode = WFA.getRealmNode( post );
				var newNode = document.createElement( "DIV");
				newNode.style.color = "#CCCCCC";
				
				if( WFA.applyColorPostBorder )
				{
					var minRank = Math.min( guildRankInfo.world_rank, guildRankInfo.area_rank );
					var borderColor = WFA.getRankColor( minRank );
					var innerBorderElement = WFA.getBorderElement( post );
					innerBorderElement.style.borderColor = borderColor;
				}
				
				newNode.innerHTML = WFA.buildRankText( guildRankInfo );
				realmNode.parentNode.parentNode.appendChild( newNode );
				
			}
			else if( !guildRankInfo || guildRankInfo == 2 )
			{
				WFA.stylePost( post, null );	
			}
		}
	}
}

var area = WFA.getForumArea();

if( area )
{
	var posts = document.evaluate( "//div[@class='postdisplay']", document,null, XPathResult.ANY_TYPE, null );
	
	var curPost = posts.iterateNext();
	var guildNode = '';
	var realmNode = '';
	var noInfo = [];
	var postsArray = [];
	
	while( curPost )
	{
		postsArray.push( curPost );	
		curPost = posts.iterateNext();
	}
	
	for( var i = 0; i < postsArray.length; i++ )
	{
		var thisPost = postsArray[i];
		guildNode = WFA.getGuildNode( thisPost );
		realmNode = WFA.getRealmNode( thisPost );
		
		if( (guildNode && realmNode)  )
		{
			guildNode = WFA.cleanGuildName( guildNode.innerHTML );
			realmNode = WFA.cleanRealmName( realmNode.innerHTML );
			
			WFA.processPost( area, realmNode, guildNode, thisPost );
		}
		else if( WFA.isBluePost( thisPost ) )
		{
			WFA.processPost( area, '', '', thisPost );
		}
		else
		{
			noInfo.push( thisPost );
		}	
	}
	
	
	
	
	for( var i = 0; i < noInfo.length; i++ )
	{
		WFA.stylePost( noInfo[i], null );
	}
}

