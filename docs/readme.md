# Eavesdrop

__By:__ Owen Gallagher

# Version History

## 0.0.1

Stuff...

# Agenda

- [x] import [request](https://github.com/request/request) module

- [x] create basic request test method to fetch youtube page

- [x] try using [youtube api](https://developers.google.com/youtube/v3/docs/)

[Youtube search sample](https://github.com/googleapis/google-api-nodejs-client/blob/master/samples/youtube/search.js).

- [x] import [i18n](https://github.com/mashpie/i18n-node) module

Will generate translations according to a given locale, and cache them in a given locales directory
for quick usage in the future.

Use [os-locale](https://www.npmjs.com/package/os-locale) module to detect language of operating
system from environment (env) object.

- [x] create translation test (plain, constants, numbers)

- [x] add [multi-page support](https://developers.google.com/calendar/v3/pagination) to youtube search method

- [x] add simple html template page for showing video results of a search

- [x] create results tests to add videos to the video player

- [x] alternative methods of getting captions for a video

[https://stackoverflow.com/a/21550325/10200417](https://stackoverflow.com/a/21550325/10200417)

[https://stackoverflow.com/questions/10036796/how-to-extract-subtitles-from-youtube-videos](https://stackoverflow.com/questions/10036796/how-to-extract-subtitles-from-youtube-videos)

This [Medium post](https://medium.com/@cafraser/how-to-download-public-youtube-captions-in-xml-b4041a0f9352)
explains a lot of what I ended up doing as a work-around.