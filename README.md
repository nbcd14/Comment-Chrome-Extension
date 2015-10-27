# Comment-Chrome-Extension
Background.js

Whenever a tab is updated to or switched to, the background page searches reddit using the URL of the current tab to see if it has been posted on Reddit. If it finds a post with the same URL, it will add the post's Reddit post ID to the RedditMap and update the badge with "reddit". If doesn't find a post, it adds "" to the RedditMap. Note both a URL with query parameters and without are used to search, unless the domain is in QRequired (this is used for domains where the query parameters determine the page returned rather than the path).

Popup.js
When the user clicks the icon, the popup page looks up the current tabs URL in the RedditMap to see if there is Reddit ID (i.e. post) associated with it. If there is, popup.js used the ID to request comments from Reddit for the post. It used toHTML to parse the response and display the comment.
