/*

Background.js

Whenever a tab is updated to or switched to, the background page searches reddit using the URL of the current tab to see if it has been posted on Reddit. If it finds a post with the same URL, it will add the post's Reddit post ID to the RedditMap and update the badge with "reddit". If it doesn't find a post, it adds "" to the RedditMap. Note both a URL with query parameters and without are used to search, unless the domain is in QRequired (this is used for domains where the query parameters determine the page returned rather than the path).

*/

var RedditSearchRequest = new XMLHttpRequest();

var redditToken = '';

//Sets options for session
var opt1 = false;
var opt2 = false;
var opt3 = true;

chrome.storage.sync.get('opt1', function(val) {opt1 = val.opt1;});
chrome.storage.sync.get('opt2', function(val) {opt2 = val.opt2;});
chrome.storage.sync.get('opt3', function(val) {opt3 = val.opt3;});

function saveChanges() {
	chrome.storage.sync.set({'opt1': opt1}, function() {});
	chrome.storage.sync.set({'opt2': opt2}, function() {});
	chrome.storage.sync.set({'opt3': opt3}, function() {});
}


var currentURL;
var RedditPostSortBy = 'comments';

//These are URL that have important query parameters (that determine the that is returned instead of the path)
//Used to remove false positives 
var QRequired = [];
QRequired['www.google.com'] = 1;
QRequired['www.google.ca'] = 1;
QRequired['www.netflix.com'] = 1;
QRequired['www.youtube.com'] = 1;



var RedditMap = [];

//Updates badge

function updateBadge() {
	
	chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
		currentURL = tabs[0].url;
		if (RedditMap[currentURL] == undefined) {
			chrome.browserAction.setBadgeText({text : "1"});
			if (currentURL.search('www.reddit.com') == -1) {
				SearchReddit(currentURL, currentURL);
			}
		} 
		else if (RedditMap[currentURL] == "") {
			chrome.browserAction.setBadgeText({text : "2"});
		}
		else {
			chrome.browserAction.setBadgeText({text : "reddit"});
		}

  	});
};


chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {updateBadge()});
chrome.tabs.onActivated.addListener(function(activeInfo) {updateBadge()});


/* Reddit Search -------------------------------------------------------------------------------------- */

//Parses the request for a Link ID (which will be added to the RedditMap and used by the popup.js to request comments) 
function AddToRedditMap(key, URL) {
return function() {	
    	if (RedditSearchRequest.readyState == 4 && RedditSearchRequest.status == 200) {
		var splitURL = key.split('?');
        	var res = JSON.parse(RedditSearchRequest.responseText);
		if (res.data.children.length > 0) {
			var assigned = 0;
			for (var i = 0; i < res.data.children.length; i++) {
				if (compURL(URL, res.data.children[0].data.url)) { 
					var RedditID = res.data.children[0].data.id;
					RedditMap[key] = RedditID;
					if (URL != key) {
						RedditMap[URL] = RedditID;
					}
					assigned = 1;
					break;	
				}
			}
			if (assigned == 0) {
				RedditMap[key] = "";
				RedditMap[URL] = "";
			}
			updateBadge();
		}	
		else if (splitURL.length > 1 && checkQRequired(URL)) {
			baseURL = splitURL[0];
			//if (RedditMap[baseURL] != undefined) {RedditMap[URL] = RedditMap[baseURL]}
			SearchReddit(baseURL, URL);
		}
		else {
			RedditMap[URL] = "";
			RedditMap[key] = "";
			updateBadge();
		}
    	}
}
}


//Search reddit with the key parameter (the URL for the current page). The URL parameter is the original URL. key may have its query parameter stripped for an expanded search
function SearchReddit(key, URL) {
    	var RedditSearchURL = 'https://www.reddit.com/search.json?q=url:' + encodeURIComponent(key) + '&sort=' + RedditPostSortBy;
	RedditSearchRequest.onreadystatechange = AddToRedditMap(key, URL);
    	RedditSearchRequest.open("GET", RedditSearchURL, true);
    	RedditSearchRequest.send();
}


//Compares the hostname and pathname of two URLs to ensure that the current URL and the URL of a reddit post are the same (to eliminate false positives) 
function compURL(url1, url2) {
	var l1 = document.createElement("a");
	var l2 = document.createElement("a");
    	l1.href = url1;
	l2.href = url2;
	var same = 0;
	if ((l1.pathname == l2.pathname) && (l1.hostname == l2.hostname)) {same = 2;}
	l1.remove();
	l2.remove();
	return same;
}

//if true the query parameter will not be stripped from the search key URL as doing so may produce a false positive (e.g. youtube.com/watch is not a unique page)
function checkQRequired(url) {
	var l1 = document.createElement("a");
	l1.href = url;
	var result = 0;
	if (QRequired[l1.hostname] == undefined) {result = 1;}
	l1.remove();
	return result;
}

