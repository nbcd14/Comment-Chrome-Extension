var PopUp = (function () {
    //Properties
    var bkg = chrome.extension.getBackgroundPage(),
        redditPostSortBy = 'comments',

        //Used to determine the average rating
        totalScore = 0,
        wgtRatings = 0,

        //Used for IRT line
        parentAuthor = '';

    function PopUp() {
        init();
    }

    function init() {
        bindEvents();

        chromeQueries();
    }

    function bindEvents() {

        //Sets the initial value of options

        $("#opt1").prop('checked', bkg.opt1);
        $("#opt2").prop('checked', bkg.opt2);
        $("#opt3").prop('checked', bkg.opt3);

        //Adds listeners
        $("#postToRedditButton").on("click", postLinkToReddit);
        $("#goToRedditButton").on("click", goToReddit);

        $("#opt1").on("click", setOpt1);
        $("#opt2").on("click", setOpt2);
        $("#opt3").on("click", setOpt3);
    }

    function chromeQueries() {
        //Checks if the URL exist in the RedditMap (i.e. the background page has searched reddit) and sends a request for comments if it does
        chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, function (tabs) {
            currentURL = tabs[0].url;
            var RedditID = bkg.RedditMap[currentURL];

            if (RedditID === 'undefined') {
                //chrome.browserAction.setBadgeText({text : "oops"});
                //bkg.SearchReddit(currentURL);
            } else if (RedditID == "") {
                document.getElementById("postToRedditButton").removeAttribute("hidden");
                document.getElementById("goToRedditButton").setAttribute("hidden", "true");
            } else {
                document.getElementById("postToRedditButton").setAttribute("hidden", true);
                document.getElementById("goToRedditButton").removeAttribute("hidden");
                document.getElementById("goToRedditButton").setAttribute("RedditID", RedditID);
                document.getElementById("id02").innerHTML = 'Requesting Comments...';
                getComments(RedditID);
            }

        });
    }

    function getComments(redditID) {
        $.get("http://www.reddit.com/comments/" + redditID + '/.json', function (res) {
            displayComments(res);
        });
    }

    function displayComments(commentResponse) {
        var link = commentResponse[0].data.children[0].data.url;
        var title = commentResponse[0].data.children[0].data.title;
        var comments = commentResponse[1];
        totalScore = 0;
        wgtRatings = 0;

        //document.getElementById("postTitle").innerHTML = '<h3>' + title + '</h3>';
        document.getElementById("id02").innerHTML = 'Loading...';
        document.getElementById("id02").innerHTML = toHTML(comments, 0);
        if (totalScore > 0) {
            document.getElementById("AvgRating").innerHTML = '<strong style="margin:20px;">Average Rating:</strong><rating>' + String(wgtRatings / totalScore) + '</rating>';
        }


        var repliesButtons = document.getElementsByClassName('RepliesButton');
        for (var i = 0; i < repliesButtons.length; i++) {
            $(repliesButtons[i]).on("click", showReplies);
            if (bkg.opt1 == true) {
                repliesButtons[i].click();
            }
        }

        var contextButtons = document.getElementsByClassName('ContextButton');
        for (var j = 0; j < contextButtons.length; j++) {
            $(contextButtons[j]).on("click", showContext);
        }
    }

    //Parse the JSON returned by the Reddit comment request
    function toHTML(comments, level) {
        if (comments == "") {
            return "";
        } else {
            comments = comments.data.children;
            var html = "";
            var i;
            var colour = 255 - 10 * (level % 2);
            var IRT = (parentAuthor == "" || !(bkg.opt2) ? "" : 'replying to <user>' + parentAuthor + '</user> ');
            for (i = 0; i < comments.length; i++) {
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
                    if (comments[i].data.replies != "") {
                        var numReplies = comments[i].data.replies.data.children.filter(function (comment) { return comment.kind == 't1'; }).length;
                    }
                    html += '<li id="' + comments[i].data.id + '">' +
                        '<div><user>' + comments[i].data.author + '</user> ' + IRT + comments[i].data.score + ' points' + ratingHTML + '<br>' + body + '</div>' +
                        (comments[i].data.replies == "" ? "" : '<button class = "RepliesButton" shown="true" numreplies="' + numReplies + '">Hide Replies (' + numReplies + ')</button>') +
                        (level == 0 ? "" : '<button class = "ContextButton" shown="false" level="' + level + '">Show Context (' + level + ')</button>') +
                        '<hr>' + toHTML(comments[i].data.replies, level + 1) + '</li>';
                }
            }
            if (level > 1 && bkg.opt2) {
                html = '<ul style="padding-left:0px" level="' + level + '">' + html + '</ul>';
            } else {
                html = '<ul style="padding-left: 20px" level="' + level + '">' + html + '</ul>';
            }
            return html;
        }
    }

    //Used in ShowContext
    function getParentComments(parent) {
        if (parent.tagName == "LI") {
            return getParentComments(parent.parentNode.parentNode) + '<li>' + parent.firstChild.innerHTML + '</li><hr>';
        } else {
            return "";
        }
    }

    //Run when a context button is clicked
    function showContext() {
        if (this.getAttribute("shown") == "false") {
            this.innerHTML = "Hide Context (" + this.getAttribute("level") + ")";
            var context = document.createElement("UL");
            context.setAttribute("class", "Context");
            context.innerHTML = getParentComments(this.parentNode.parentNode.parentNode);
            this.parentNode.insertBefore(context, this.parentNode.childNodes[0]);
            this.setAttribute("shown", "true");
        } else if (this.getAttribute("shown") == "true") {
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
    function showReplies() {
        if (this.getAttribute("shown") == "false") {
            this.parentNode.getElementsByTagName("ul")[0].removeAttribute("hidden");
            this.innerHTML = "Hide Replies (" + this.getAttribute("numReplies") + ")";
            this.setAttribute("shown", "true");
        } else if (this.getAttribute("shown") == "true") {
            this.parentNode.getElementsByTagName("ul")[0].setAttribute("hidden", true);
            this.innerHTML = "UnHide Replies (" + this.getAttribute("numReplies") + ")";
            this.setAttribute("shown", "false");
        }
    }


    //Used to open a window to Reddit either to post a link or view a comment section
    function postLinkToReddit() {
        chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, function (tabs) {
            var RSurl = 'https://www.reddit.com/submit?url=' + encodeURIComponent(tabs[0].url);
            chrome.tabs.create({ active: true, url: RSurl });
        });
    }

    function goToReddit() {
        chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, function (tabs) {
            var redditId = document.getElementById("goToRedditButton").getAttribute("RedditID");
            var commentUrl = 'https://www.reddit.com/comments/' + redditId;
            chrome.tabs.create({ active: true, url: commentUrl });
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
        return { parsedBody: body, parsedRating: ratingHTML, ratingNum: rating };
    }

    //Sets options
    function setOpt1() {
        bkg.opt1 = $("#opt1").prop('checked');
        saveChanges();
    }

    function setOpt2() {
        bkg.opt2 = $("#opt2").prop('checked');
        saveChanges();
    }

    function setOpt3() {
        bkg.opt3 = $("#opt3").prop('checked');
    }

    function saveChanges() {
        bkg.saveChanges();
    }

    //parse the body_html field in the response JSON	
    function parseBody(body) {
        return htmlDecode(body);
    }

    //https://stackoverflow.com/questions/7394748/whats-the-right-way-to-decode-a-string-that-has-special-html-entities-in-it
    function htmlDecode(value) {
        return $("<div/>").html(value).text();
    }

    function htmlEncode(value) {
        return $('<div/>').text(value).html();
    }

    return PopUp;

})();
var vm = new PopUp();