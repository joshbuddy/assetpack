Assetpack
=========

To compress js, go to /js with PUT. The body should be the js file you want to request. For css, go to /css with PUT and do the same.

You can proxy a request through by going to /proxy/:url. The file extension is used to determine if it's css or js.

For example: curl http://assetpack.herokuapp.com/proxy/http://nodejs.org/docs/v0.4.8/api/assets/style.css

The source is available at https://github.com/joshbuddy/assetpack
