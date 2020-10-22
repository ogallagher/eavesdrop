/*

Owen Gallagher
2020-10-22

*/

// external imports

import { google } from 'googleapis'

// internal imports

import { Logger } from './logger.js'

// constants

const NAME = 'eavesdrop:api_client'
export const log = new Logger(NAME)

// ApiClient class

export function ApiClient(api_key) {
	this.youtube = google.youtube({
		version: 'v3',
		auth: api_key
	})
}

ApiClient.prototype.youtube_search = function(terms) {
	return new Promise(function(resolve,reject) {
		log.error('ApiClient.youtube_search not yet implemented')
		reject('api_client.undefined')
	})
}

export default ApiClient
