/*

Popup.js

When the user clicks the icon, the popup page looks up the current tab's URL in the RedditMap to see if there is a Reddit ID (i.e. post) associated with it. If there is, popup.js uses the ID to request comments from Reddit for the post. It uses toHTML to parse the response and display the comment.

*/

var bkg = chrome.extension.getBackgroundPage();
var RedditSearchRequest = new XMLHttpRequest();
var currentURL;
var RedditPostSortBy = 'comments';

//Used to determine the average rating

var totalScore = 0;
var wgtRatings = 0;

//Used for IRT line

var parentAuthor = '';

//Sets the initial value of options

document.getElementById("opt1").checked = bkg.opt1;
document.getElementById("opt2").checked = bkg.opt2;
document.getElementById("opt3").checked = bkg.opt3;

//Adds listeners

document.getElementById("tab1").addEventListener("click", switchToTab1);
document.getElementById("tab2").addEventListener("click", switchToTab2);

document.getElementById("postToRedditButton").addEventListener("click", postLinkToReddit);
document.getElementById("goToRedditButton").addEventListener("click", goToReddit);

document.getElementById("opt1").addEventListener("click", setOpt1);
document.getElementById("opt2").addEventListener("click", setOpt2);
document.getElementById("opt3").addEventListener("click", setOpt3);

//Checks if the URL exist in the RedditMap (i.e. the background page has searched reddit) and sends a request for comments if it does

chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
	currentURL = tabs[0].url;
	var RedditID = bkg.RedditMap[currentURL];

	if (RedditID == undefined)  {
		//chrome.browserAction.setBadgeText({text : "oops"});
		//bkg.SearchReddit(currentURL);
	}	
	else if (RedditID == "") {
		document.getElementById("postToRedditButton").removeAttribute("hidden");
		document.getElementById("goToRedditButton").setAttribute("hidden", "true");
	}
	else {
		document.getElementById("postToRedditButton").setAttribute("hidden", true);
		document.getElementById("goToRedditButton").removeAttribute("hidden");
		document.getElementById("goToRedditButton").setAttribute("RedditID", RedditID);
		RedditCommentRequest.open("GET", 'http://www.reddit.com/comments/' + RedditID + '/.json', true);
		document.getElementById("id02").innerHTML = 'Requesting Comments...';
        	RedditCommentRequest.send();
	}

});

var RedditCommentRequest = new XMLHttpRequest();
	
//Receives the Reddit response for comments and parses the response using toHTML. It also adds listeners to the Context and Reply buttons

RedditCommentRequest.onreadystatechange = function() {	
    if (RedditCommentRequest.readyState == 4 && RedditCommentRequest.status == 200) {
       var res = JSON.parse(RedditCommentRequest.responseText);
    	var link = res[0].data.children[0].data.url;
	var title = res[0].data.children[0].data.title;
    	var comments = res[1];
	totalScore = 0;
	wgtRatings = 0;

	//document.getElementById("postTitle").innerHTML = '<h3>' + title + '</h3>';
	document.getElementById("id02").innerHTML = 'Loading...';       
	document.getElementById("id02").innerHTML = toHTML(comments, 0);
	if (totalScore > 0) {
		document.getElementById("AvgRating").innerHTML = '<strong style="margin:20px;">Average Rating:</strong><rating>' + String(wgtRatings/totalScore) + '</rating>';
	}	


	var RepliesButtons = document.getElementsByClassName('RepliesButton');
	for (var i = 0; i < RepliesButtons.length; i++) {
        	RepliesButtons[i].addEventListener("click", ShowReplies);
		if (bkg.opt1 == true) { RepliesButtons[i].click();}
    	}

	var ContextButtons = document.getElementsByClassName('ContextButton');
	for (var i = 0; i < ContextButtons.length; i++) {
        	ContextButtons[i].addEventListener("click", ShowContext);
    	}
	

    }
}

//Parse the JSON returned by the Reddit comment request
function toHTML(comments, level) {
    if (comments == "") {
	return "";
    }
    else {
    	comments = comments.data.children;
    	var html = "";
    	var i;
	var colour = 255 - 10*(level % 2);
	var IRT = (parentAuthor == "" || !(bkg.opt2) ? "" : 'replying to <user>' + parentAuthor + '</user> '); 
    	for(i = 0; i < comments.length; i++) {
		if (comments[i].kind == "t1") {
			var body = parseBody(comments[i].data.body_html); //body_html
			var ratingHTML = ''; 

			if (body.search("Rating:") != -1 && bkg.opt3) {
				var parsed = parseRating(body);
				body = parsed.parsedBody;
				ratingHTML = parsed.parsedRating;
				if (parsed.ratingNum != -1) {
					wgtRatings += parsed.ratingNum * Math.max(Number(comments[i].data.score + 1), 0);
					totalScore += Math.max(Number(comments[i].data.score) + 1, 0);
				}
			}

			parentAuthor = comments[i].data.author;
			if (comments[i].data.replies != "") { var numReplies = comments[i].data.replies.data.children.filter(function (comment) {return  comment.kind == 't1';}).length;}
			html += '<li id="' + comments[i].data.id + '">' + 
				'<div><user>' + comments[i].data.author + '</user> ' + IRT + comments[i].data.score + ' points' + ratingHTML + '<br>' + body + '</div>' +
				(comments[i].data.replies == "" ? "" : '<button class = "RepliesButton" shown="true" numreplies="' + numReplies + '">Hide Replies (' + numReplies + ')</button>') + 
				(level == 0 ? "" : '<button class = "ContextButton" shown="false" level="' + level + '">Show Context (' + level + ')</button>') + 
				'<hr>' + toHTML(comments[i].data.replies, level + 1) + '</li>';
		}
    	}
	if (level > 1 && bkg.opt2) {html = '<ul style="padding-left:0px" level="' + level + '">' + html + '</ul>';}
	else {html = '<ul style="padding-left: 20px" level="' + level + '">' + html + '</ul>';}
    	return html;
    }
}

//Used in ShowContext
function getParentComments(parent) {
	if (parent.tagName == "LI") {
		return getParentComments(parent.parentNode.parentNode) + '<li>' + parent.firstChild.innerHTML + '</li><hr>';
	}
	else {
		return "";
	}
}

//Run when a context button is clicked
function ShowContext() {
	if (this.getAttribute("shown") == "false") {
		this.innerHTML = "Hide Context (" + this.getAttribute("level") + ")";
		context = document.createElement("UL");
		context.setAttribute("class", "Context");
		context.innerHTML = getParentComments(this.parentNode.parentNode.parentNode);
		this.parentNode.insertBefore(context, this.parentNode.childNodes[0]);
		this.setAttribute("shown", "true");
	}
	else if (this.getAttribute("shown") == "true") {
		for (var i = 0; i < this.parentNode.childNodes.length; i++) {
			if (this.parentNode.childNodes[i].getAttribute("class") == "Context") {
				this.parentNode.removeChild(this.parentNode.childNodes[i]);
			}
		}
		this.innerHTML = "Show Context (" + this.getAttribute("level") + ")";
		this.setAttribute("shown", "false");
	}
}

//Run when a reply button is clicked
function ShowReplies(button) {
	if (this.getAttribute("shown") == "false") {
   		this.parentNode.getElementsByTagName("ul")[0].removeAttribute("hidden");
		this.innerHTML = "Hide Replies (" + this.getAttribute("numReplies") + ")";
		this.setAttribute("shown", "true");
	}
	else if (this.getAttribute("shown") == "true") {
		this.parentNode.getElementsByTagName("ul")[0].setAttribute("hidden", true);
		this.innerHTML = "UnHide Replies (" + this.getAttribute("numReplies") + ")";
		this.setAttribute("shown", "false");
	}

}


function Indent(replies) {
	IndentedComments = document.getElementByClassName("Indented");
   	for (var i = 0; i < IndentedComments.length; i++) {
		IndentedComment[i].setAttribute("class", "UnIndented");
   	}
	replies.setAttribute("class", "Indented");
}

//Used to switch between tabs
function switchToTab1() {
	document.getElementById("id03").setAttribute("hidden", true);
	document.getElementById("id02").removeAttribute("hidden");
}

function switchToTab2() {
	document.getElementById("id02").setAttribute("hidden", true);
	document.getElementById("id03").removeAttribute("hidden");
}

//Used to open a window to Reddit either to post a link or view a comment section
function postLinkToReddit() {
	chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
		var RSurl = 'https://www.reddit.com/submit?url=' + encodeURIComponent(tabs[0].url);	
		var nw = chrome.windows.create({url: RSurl , width: 1000, height: 1000});
	});	
}

function goToReddit() {
	chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
		var RedditID = document.getElementById("goToRedditButton").getAttribute("RedditID");
		var RCurl = 'https://www.reddit.com/comments/' + RedditID;	
		var nw = chrome.windows.create({url: RCurl , width: 1000, height: 1000}); //type: 'panel'
	});
	
}

//Searches the body of a comment for a rating (used in toHTML if opt3 is true)
function parseRating(body) {
	var ratingHTML = '';
	var rating = -1;
	if (body.search('Rating:0') != -1) {
		ratingHTML = '<rating style="background:#FF0033">0/5</rating>';
		body = body.replace('Rating:0', '');
		rating = 0;
	} else if (body.search('Rating:1') != -1) {
		ratingHTML = '<rating style="background:#FF6633">1/5</rating>';
		body = body.replace('Rating:1', '');
		rating = 1;
	} else if (body.search('Rating:2') != -1) {
		ratingHTML = '<rating style="background:#FF9933">2/5</rating>';
		body = body.replace('Rating:2', '');
		rating = 2;
	} else if (body.search('Rating:3') != -1) {
		ratingHTML = '<rating style="background:#CCCC33">3/5</rating>';
		body = body.replace('Rating:3', '');
		rating = 3;
	} else if (body.search('Rating:4') != -1) {
		ratingHTML = '<rating style="background:#CCFF33">4/5</rating>';
		body = body.replace("Rating:4", "");
		rating = 4;
	} else if (body.search('Rating:5') != -1) {
		ratingHTML = '<rating style="background:#99CC33">5/5</rating>';
		body = body.replace('Rating:5', '');
		rating = 5;
	}
	return {parsedBody: body, parsedRating: ratingHTML, ratingNum: rating};
}

//Sets options
function setOpt1() {
	bkg.opt1 = document.getElementById("opt1").checked;
	bkg.saveChanges();
}

function setOpt2() {
	bkg.opt2 = document.getElementById("opt2").checked;
	bkg.saveChanges();
}

function setOpt3() {
	bkg.opt3 = document.getElementById("opt3").checked;
	bkg.saveChanges();
}

//parse the body_html field in the response JSON	
function parseBody (body) {
	body = body.split('&lt;p&gt;').join('<p>');
	body = body.split('&lt;/p&gt;').join('</p>');
	body = body.split('&lt;div class=\"md\"&gt;').join('');
	body = body.split('&lt;/div&gt;').join('');
	body = body.split('&lt;strong&gt;').join('<strong>');
	body = body.split('&lt;/strong&gt;').join('</strong>');
	body = body.split('&lt;blockquote&gt;').join('<blockquote>');
	body = body.split('&lt;/blockquote&gt;').join('</blockquote>');
	body = body.split('&lt;em&gt;').join('<em>');
	body = body.split('&lt;/em&gt;').join('</em>');
	body = body.split('&lt;del&gt;').join('<del>');
	body = body.split('&lt;/del&gt;').join('</del>');
	body = body.split('&lt;sup&gt;').join('<sup>');
	body = body.split('&lt;/sup&gt;').join('</sup>');
	body = body.split('&lt;li&gt;').join('<li>');
	body = body.split('&lt;/li&gt;').join('</li>');
	body = body.split('&lt;ul&gt;').join('<ul>');
	body = body.split('&lt;/ul&gt;').join('</ul>');
	body = body.split('&amp;#39;').join("'");
	body = body.split('&amp;quot;').join('"');
	body = body.split('&lt;br&gt;').join('<br>');
	body = body.split('&lt;/a&gt;').join('');
	body = body.split('&lt;a href=').join('<');
	//body = body.split('&lt;').join('<');
	//body = body.split('&gt;').join('>');
	return body;
}

