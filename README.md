# DistroWatch Parser

This package provides both a command and a library you can use to get rankings out of the website.

Because DistroWatch does not provide an API for the ranking, this library does its thing by simply
requesting the page and parsing the result and then converting it to objects.

It uses typescript under the hood as well as axios (to make the requests) and cheerio (to parse the response)
as well as some other libraries.
