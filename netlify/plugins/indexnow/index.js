'use strict'

const http = require('http')
const https = require('https')
const path = require('path')
const { readFile } = require('fs/promises')
const { URL } = require('url')

const requestJson = (urlString, payload) =>
  new Promise((resolve, reject) => {
    const url = new URL(urlString)
    const body = JSON.stringify(payload)
    const client = url.protocol === 'https:' ? https : http
    const request = client.request(
      url,
      {
        method: 'POST',
        headers: {
          'User-Agent': 'Netlify-Build-IndexNow',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (response) => {
        let responseBody = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          responseBody += chunk
        })
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            statusMessage: response.statusMessage,
            body: responseBody,
          })
        })
      },
    )

    request.on('error', reject)
    request.setTimeout(15000, () => {
      request.destroy(new Error('IndexNow request timed out'))
    })
    request.write(body)
    request.end()
  })

const assertAbsoluteUrl = (value, name) => {
  try {
    const url = new URL(value)
    if (!url.protocol || !url.host) {
      throw new Error('Missing protocol/host')
    }
  } catch (error) {
    throw new Error(`The ${name} must be a valid absolute URL. Received "${value}".`)
  }
}

const extractUrlsFromSitemap = (sitemapContent) => {
  const urls = []
  const regex = /<loc>(.*?)<\/loc>/gi
  let match
  while ((match = regex.exec(sitemapContent)) !== null) {
    const candidate = match[1].trim()
    if (candidate) {
      urls.push(candidate)
    }
  }
  return urls
}

module.exports = {
  onPostBuild: async ({ inputs, utils }) => {
    const {
      key,
      submitUrl,
      sitemapPath = 'sitemap.xml',
      endpoint = 'https://api.indexnow.org/indexnow',
      host,
      keyLocation,
    } = inputs

    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      utils.build.failPlugin('IndexNow key is required and must be a non-empty string.')
      return
    }

    assertAbsoluteUrl(endpoint, 'endpoint')

    let urlList = []
    if (sitemapPath) {
      try {
        const absolutePath = path.resolve(process.cwd(), sitemapPath)
        const sitemapContent = await readFile(absolutePath, 'utf8')
        urlList = extractUrlsFromSitemap(sitemapContent)
      } catch (error) {
        utils.build.failPlugin(`Unable to read sitemap at "${sitemapPath}": ${error.message}`)
        return
      }
    }

    if (!urlList.length) {
      if (!submitUrl || typeof submitUrl !== 'string') {
        utils.build.failPlugin('Provide a sitemapPath with at least one <loc> entry or supply a submitUrl.')
        return
      }
      assertAbsoluteUrl(submitUrl, 'submitUrl')
      urlList = [submitUrl]
    } else {
      urlList = Array.from(
        new Set(
          urlList.filter((entry) => {
            try {
              assertAbsoluteUrl(entry, 'sitemap URL')
              return true
            } catch (error) {
              utils.status.show({
                title: 'IndexNow sitemap warning',
                summary: `Ignored invalid <loc> entry "${entry}": ${error.message}`,
              })
              return false
            }
          }),
        ),
      )
    }

    if (!urlList.length) {
      utils.build.failPlugin('No valid URLs available to send to IndexNow.')
      return
    }

    const derivedHost = host || new URL(urlList[0]).host
    const derivedKeyLocation = keyLocation || `https://${derivedHost}/${key}.txt`
    assertAbsoluteUrl(derivedKeyLocation, 'keyLocation')

    const payload = {
      host: derivedHost,
      key,
      keyLocation: derivedKeyLocation,
      urlList,
    }

    try {
      const { statusCode, statusMessage, body } = await requestJson(endpoint, payload)

      if (statusCode >= 200 && statusCode < 300) {
        utils.status.show({
          title: 'IndexNow ping',
          summary: `Submitted ${urlList.length} URL(s) to ${endpoint} (status ${statusCode}).`,
        })
      } else {
        const message = body ? `${statusMessage}: ${body}` : statusMessage
        utils.build.failPlugin(`IndexNow submission failed with status ${statusCode} ${message}`)
      }
    } catch (error) {
      utils.build.failPlugin(`IndexNow submission error: ${error.message}`)
    }
  },
}

module.exports.inputs = [
  {
    name: 'key',
    required: true,
    description: 'IndexNow verification key matching the file served at /<key>.txt',
  },
  {
    name: 'sitemapPath',
    required: false,
    description: 'Relative path to the sitemap used to build the URL list (defaults to sitemap.xml).',
    default: 'sitemap.xml',
  },
  {
    name: 'submitUrl',
    required: false,
    description: 'Absolute URL to submit when no sitemap is provided.',
  },
  {
    name: 'host',
    required: false,
    description: 'Host name sent to IndexNow. Defaults to the host extracted from the first URL.',
  },
  {
    name: 'keyLocation',
    required: false,
    description: 'Absolute URL where the verification key is hosted. Defaults to https://<host>/<key>.txt',
  },
  {
    name: 'endpoint',
    required: false,
    description: 'IndexNow endpoint to call. Defaults to the shared IndexNow API.',
    default: 'https://api.indexnow.org/indexnow',
  },
]
