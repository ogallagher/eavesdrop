/*

Owen Gallagher
2020-10-22

*/

// external imports

import { google } from 'googleapis'
import fs from 'fs'

// internal imports

import { 
	PROGRAM_NAME,
	CREDENTIALS_PATH,
	HTTP_STATUS_OK
} from './consts.js'

import { Logger } from './logger.js'

// constants

const NAME = PROGRAM_NAME + ':api_client'
export const log = new Logger(NAME)

//variables

let youtube_api_key = undefined

// methods

export function init() {
	return new Promise(function(resolve,reject) {
		log.debug(`loading api keys from ${CREDENTIALS_PATH}`)
	
		fs.readFile(CREDENTIALS_PATH, function(err, json) {
			if (err) {
				log.error('failed to load api keys')
				reject(err)
			}
			else {
				let credentials = JSON.parse(json)
		
				youtube_api_key = credentials.youtube_api_key
			
				resolve()
			}
		})
	})
}

// ApiClient class

export function ApiClient() {
	this.youtube = google.youtube({
		version: 'v3',
		auth: youtube_api_key
	})
}

ApiClient.prototype.youtube_search = function(query) {
	let self = this
	
	return new Promise(function(resolve,reject) {
		log.warning('ApiClient.youtube_search not yet finished')
		
		self.youtube.search.list({
			part: 'id,snippet',
			q: query
		})
		.then(function(res) {
			if (res.status == HTTP_STATUS_OK) {
				log.debug(res.data)
				
				for (let item of res.data.items) {
					log.debug(item)
				}
				
				resolve(res.data)
			}
			else {
				log.info(res)
			}
		})
		.catch(function(err) {
			reject(err)
		})
	})
}

export default ApiClient
