/*

Owen Gallagher
2020-10-22

*/

// external imports

import { google } from 'googleapis'
import fs from 'fs'
import request from 'request'

// internal imports

import { 
	PROGRAM_NAME,
	CREDENTIALS_PATH,
	HTTP_STATUS_OK,
	API_QUOTA_YOUTUBE,
	APIU_YTB_SEARCH,
	APIU_YTB_VIDEOS_LIST,
	APIU_YTB_CAPTIONS_LIST,
	APIU_YTB_CAPTIONS_DOWNLOAD,
	CONFIG_PATH,
	TOTAL_RESULTS_MAX,
	CAPTIONS_PATH_PREFIX,
	CAPTIONS_FILETYPE,
	YTB_VIDEO_INFO_URL,
	YTB_VIDEO_INFO_EURL,
	YTB_VIDEO_INFO_VID_PARAM,
	YTB_VIDEO_INFO_BEGIN,
	YTB_VIDEO_INFO_END,
	YTB_VIDEO_INFO_END_OVERLAP,
	YTB_TIMEDTEXT_LANG_PARAM,
	URL_QUERY_PREFIX,
	URL_PARAM_DELIM,
	TIMEDTEXT_FILETYPE,
	TIMEDTEXT_PATH_PREFIX
} from './consts.js'

import Logger from './logger.js'

import {
	get_language
} from './io.js'

import {
	get_config,
	write_config
} from './util.js'

import {
	TimedTextCleaner
} from './read_captions.js'

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
				log.error(err)
				reject('api_client.init.credentials')
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

export function finish(config) {
	return new Promise(function(resolve,reject) {
		let do_write_config = false
		let p
		if (config == undefined) {
			do_write_config = true
			p = get_config()
		}
		else {
			p = Promise.resolve(config)
		}
		
		p.then(function(config) {
			//write youtube api usage to config object
			config.api_usage.youtube = youtube_api_usage
			log.info(`youtube api usage = ${youtube_api_usage}`)
			
			if (do_write_config) {
				//write config object to file
				write_config(config)
				.then(resolve)
				.catch(function(err) {
					log.error(err)
					log.error('failed to write to config file')
					reject('api_client.finish.config.write')
				})
			}
			else {
				resolve()
			}
		})
		.catch(function(err) {
			log.error(err)
			log.error('failed to update config file')
			reject('api_client.finish.config')
		})
	})
}

// ApiClient class

export function ApiClient() {
	this.youtube = google.youtube({
		version: 'v3',
		auth: youtube_api_key
	})
	
	this.search_results_max = 50 //0 to 50; 25 is medium
}

ApiClient.prototype.youtube_search = function(query, page_token) {
	let self = this
	
	return new Promise(function(resolve,reject) {
		log.debug(`performing ApiClient.youtube_search from page ${page_token}`)
		
		let options = {
			part: 'id',
			q: query,
			type: 'video',
			videoCaption: 'closedCaption',
			maxResults: self.search_results_max
		}
		
		if (page_token) {
			options.pageToken = page_token
		}
		
		youtube_api_usage += APIU_YTB_SEARCH
		self.youtube.search.list(options)
		.then(function(res) {
			if (res.status == HTTP_STATUS_OK) {
				log.debug('youtube_search finished; returning results')
				resolve({
					data: res.data,
					next_page: res.data.nextPageToken,
					prev_page: res.data.prevPageToken
				})
			}
			else {
				log.error(res)
				reject('api_client.youtube_search.http')
			}
		})
		.catch(function(err) {
			youtube_api_usage -= APIU_YTB_SEARCH
			log.error(err)
			reject('api_client.youtube_search')
		})
	})
}

ApiClient.prototype.youtube_videos_list = function(video_ids, page_token) {
	let self = this
	
	return new Promise(function(resolve,reject) {
		log.debug(`performing ApiClient.youtube_videos_list for ${video_ids} from page ${page_token}`)
		
		if (video_ids instanceof Array) {
			youtube_api_usage += APIU_YTB_VIDEOS_LIST
			self.youtube.videos.list({
				part: 'id,snippet,player,contentDetails',
				id: video_ids.join(','),
				pageToken: page_token
			})
			.then(function(res) {
				if (res.status == HTTP_STATUS_OK) {
					resolve({
						data: res.data,
						next_page: res.data.nextPageToken,
						prev_page: res.data.prevPageToken
					})
				}
				else {
					log.error(res)
					reject('api_client.youtube_videos_list.http')
				}
			})
			.catch(function(err) {
				log.error(err)
				reject('api_client.youtube_videos_list')
			})
		}
		else {
			youtube_api_usage -= APIU_YTB_VIDEOS_LIST
			log.error('video_ids must be an array')
			reject('api_client.youtube_videos_list.args')
		}
	})
}

ApiClient.prototype.youtube_timedtext_download = function(video_id) {
	return new Promise(function(resolve,reject) {
		log.debug(`performing ApiClient.youtube_timedtext_info for ${video_id}`)
		
		request
		.get(
			YTB_VIDEO_INFO_URL + URL_QUERY_PREFIX + 
			YTB_VIDEO_INFO_VID_PARAM + video_id + URL_PARAM_DELIM + 
			YTB_VIDEO_INFO_EURL + video_id, 
		function (err, res, body) {
			if (err || res.statusCode != 200) {
				log.error('youtube video info request error')
				log.error(err)
				reject('api_client.youtube_timedtext_download.video.http')
			}
			else {
				// isolate video info json
				let video_info = decodeURIComponent(body)
				
				let captions_info_start = 
					video_info.indexOf(YTB_VIDEO_INFO_BEGIN) + 
					YTB_VIDEO_INFO_BEGIN.length
				
				let captions_info_end = 
					video_info.indexOf(YTB_VIDEO_INFO_END) + YTB_VIDEO_INFO_END_OVERLAP
				
				if (captions_info_end < captions_info_start) {
					captions_info_end = video_info.length
				}
				
				try {
					video_info = JSON.parse(video_info.substring(
						captions_info_start,captions_info_end))
					
					if (video_info.playabilityStatus.status == 'OK' && video_info.captions != undefined) {
						// extract captions info from video info
						let captions_info = video_info.captions.playerCaptionsTracklistRenderer
						
						// remove video_info from memory
						video_info = null
					
						let ttxt_info = captions_info.captionTracks[0]
						let ttxt_url = ttxt_info.baseUrl
						let language = get_language()
						let available = true
						
						log.debug(`original timedtext language = ${ttxt_info.languageCode}`)
						if (ttxt_info.languageCode.substring(0,2) != language) {
							// will need to request translated timedtext
							if (ttxt_info.isTranslatable) {
								// let original_lang = ttxt_info.languageCode
								// ttxt_url = ttxt_url
								// .replace(`lang=${original_lang}`,
								// 	`${YTB_TIMEDTEXT_LANG_PARAM}${language}`)
								//
								// log.debug(`requesting translated timedtext to ${language}`)
								log.error('translation of timedtext is not implemented')
								//reject('api_client.youtube_timedtext_download.ttxt.translate')
							}
							else {
								available = false
							}
						}
						
						if (available) {
							let ttxt_path = `${TIMEDTEXT_PATH_PREFIX}${video_id}.${TIMEDTEXT_FILETYPE}`
							
							//download timedtext file
							request
							.get(ttxt_url)
							.pipe(new TimedTextCleaner())
							.pipe(fs.createWriteStream(ttxt_path))
							.on('finish', () => {
								log.info('downloaded to ' + ttxt_path)
								resolve(ttxt_path)
							})
							.on('error', function(err) {
								log.error(err)
								reject('api_client.youtube_timedtext_download.ttxt.download')
							})
						}
						else {
							log.error(`${language} timedtext not available for ${video_id}`)
							reject('api_client.youtube_timedtext_download.ttxt.language')
						}
					}
					else {
						log.error(`video info for ${video_id} is not available, at least for now`)
						reject('api_client.youtube_timedtext_download.blocked')
					}
				}
				catch (e) {
					log.error(e)
					log.error(video_info)
					reject('api_client.youtube_timedtext_download.parse')
				}
			}
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
				resolve(res.data)
			}
			else {
				log.error(res)
				reject('api_client.youtube_captions_list.http')
			}
		})
		.catch(function(err) {
			youtube_api_usage -= APIU_YTB_CAPTIONS_LIST
			log.error(err)
			reject('api_client.youtube_captions_list')
		})
	})
}

ApiClient.prototype.youtube_captions_download = function(captions_id, video_id) {
	let self = this
	
	return new Promise(function(resolve,reject) {
		log.debug(`performing ApiClient.youtube_captions_download for ${captions_id} ${video_id}`)
		
		youtube_api_usage += APIU_YTB_CAPTIONS_DOWNLOAD
		self.youtube.captions.download({
			id: captions_id,
			tfmt: CAPTIONS_FILETYPE
		})
		.then(function(res) {
			if (res.status == HTTP_STATUS_OK) {
				let file_path = CAPTIONS_PATH_PREFIX + video_id + '.' + CAPTIONS_FILETYPE
				console.log(res.data)
				resolve(file_path)
			}
			else {
				log.error(res)
				reject('api_client.youtube_captions_download.http')
			}
		})
		.catch(function(err) {
			youtube_api_usage -= APIU_YTB_CAPTIONS_DOWNLOAD
			log.error(err)
			reject('api_client.youtube_captions_download')
		})
	})
}

export default ApiClient
