const COOKIE_NAME = '__url'
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {

  let fetchURL_Get
  /* Ask user for cookies */
  const __url_cookie = getCookie(request, COOKIE_NAME)
  if (__url_cookie) {
    fetchURL_Get = __url_cookie
  } else {
    fetchURL_Get = await getFetchURL()

    /* Hand user some cookies for 1 hours */
    var date = new Date()
    date.setTime(date.getTime() + (60 * 60 * 1000))
    var biscuit = `${COOKIE_NAME}=${fetchURL_Get}; Expires=${date.toGMTString()}`
  }

  /* Handle request made to website */
  let data = await fetchURL(fetchURL_Get)
  let response = new Response(data, {
    headers: { 'content-type': 'text/html' },
  })

  let transformedData = await transformHTML(response)

  if (__url_cookie == null) {
    transformedData.headers.set('Set-Cookie', biscuit)
  }

  return transformedData
}

async function fetchURL(url) {

  /* Get data from served url from load balancer */
  let response = await fetch(url)
  return response.text()
}

/*  Load balancing features refeer to blogpost:
    https://blog.cloudflare.com/update-response-headers-on-cloudflare-workers/

*/

async function getFetchURL() {

  /* Get available variants of website */
  var JSONURL = 'https://cfw-takehome.developers.workers.dev/api/variants'
  let response = await fetch(JSONURL)
  let data = await response.json()
  return data.variants[getRandomInt(data.variants.length)] // Return random varian to preserve evenly load balancing
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

/*  Website text replacement functions
    thanks to blogpost: https://blog.cloudflare.com/html-rewriter-beta/
*/

class TitleHandler {
  element(element) {
    element.setInnerContent('I\'am Vriyas Hartama')
  }
}

class DescriptionHandler {
  element(element) {
    element.setInnerContent('Welcome to page built on top Cloudflare with load balancing on Workers.')
  }
}

class LinkHandler {
  constructor(attributeName) {
    this.attributeName = attributeName
  }
  element(element) {
    const attribute = element.getAttribute(this.attributeName)
    if (attribute) {
      element.setAttribute(
        this.attributeName,
        attribute.replace('https://cloudflare.com', 'https://vriyas.com')
      )
    }
    element.setInnerContent('Go to my website...')
  }
}

async function transformHTML(data) {

  /* Transform HTML data into my customization */
  const rewriter = new HTMLRewriter()
    .on('title', new TitleHandler())
    .on('h1#title', new TitleHandler())
    .on('p#description', new DescriptionHandler())
    .on('a#url', new LinkHandler('href'))
  return rewriter.transform(data)
}

/**
 * Grabs the cookie with name from the request headers
 * @param {Request} request incoming Request
 * @param {string} name of the cookie to grab
 */

function getCookie(request, name) {
  let result = null
  let cookieString = request.headers.get('Cookie')
  if (cookieString) {
    let cookies = cookieString.split(';')
    cookies.forEach(cookie => {
      let cookieName = cookie.split('=')[0].trim()
      if (cookieName === name) {
        let cookieVal = cookie.split('=')[1]
        result = cookieVal
      }
    })
  }
  return result
}