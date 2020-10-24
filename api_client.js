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
	HTTP_STATUS_OK,
	API_QUOTA_YOUTUBE,
	APIU_YTB_SEARCH,
	APIU_YTB_CAPTIONS_LIST,
	APIU_YTB_CAPTIONS_DOWNLOAD
} from './consts.js'

import { Logger } from './logger.js'

// constants

const NAME = PROGRAM_NAME + ':api_client'
export const log = new Logger(NAME)

//variables

let youtube_api_key = undefined
let youtube_api_usage = 0

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

export function config(config) {
	if (config.api_usage == undefined) {
		config.api_usage = {}
	}
	if (config.api_usage.youtube == undefined) {
		config.api_usage.youtube = youtube_api_usage
	}
	youtube_api_usage = config.api_usage.youtube
}

// ApiClient class

export function ApiClient() {
	this.youtube = google.youtube({
		version: 'v3',
		auth: youtube_api_key
	})
	
	this.search_results_max = 25 //0 to 50; 25 is medium
}

ApiClient.prototype.youtube_search = function(query, page_token) {
	let self = this
	
	return new Promise(function(resolve,reject) {
		log.debug(`performing ApiClient.youtube_search from page ${page_token}`)
		
		youtube_api_usage += APIU_YTB_SEARCH
		self.youtube.search.list({
			part: 'id,snippet,player',
			q: query,
			type: 'video',
			videoCaption: 'closedCaption',
			maxResults: self.search_results_max,
			pageToken: page_token
		})
		.then(function(res) {
			if (res.status == HTTP_STATUS_OK) {
				log.debug(res.data)
				log.debug(res.data.items[0])
				
				resolve({
					data: res.data,
					next_page: res.data.nextPageToken,
					prev_page: res.data.prevPageToken
				})
			}
			else {
				log.info(res)
			}
		})
		.catch(function(err) {
			log.error(err)
			reject('api_client.youtube_search')
		})
	})
}

ApiClient.prototype.youtube_captions_list = function(video_id) {
	let self = this
	
	return new Promise(function(resolve,reject) {
		log.debug(`performing ApiClient.youtube_captions for ${video_id}`)
		
		youtube_api_usage += APIU_YTB_CAPTIONS_LIST
		self.youtube.captions.list({
			videoId: video_id,
			part: 'id,snippet'
		})
		.then(function(res) {
			if (res.status == HTTP_STATUS_OK) {
				log.debug(res.data.items)
			}
		})
		.catch(function(err) {
			log.error(err)
			reject('api_client.youtube_captions_list')
		})
	})
}

export default ApiClient
