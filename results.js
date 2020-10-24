/*

Owen Gallagher
2020-10-23

*/

// external imports

import fs from 'fs'
import path from 'path'

import { 
	parse as html_parse 
} from 'node-html-parser'

import {
	exec as process_exec
} from 'child_process'

// local imports

import {
	PROGRAM_NAME,
	OS_NAME,
	VIDEO_PLAYER_PATH
} from './consts.js'

import Logger from './logger.js'

// constants

const NAME = PROGRAM_NAME + ':results'
export const log = new Logger(NAME)

// variables

// video_player_html can be set to null at any time to free memory if needed
let video_player_html = null

// methods

function load_video_player() {
	return new Promise(function(resolve,reject) {
		fs.readFile(VIDEO_PLAYER_PATH, function(err, data) {
			if (err) {
				log.error('failed to read video player file')
				log.error(err)
				reject('results.load.file')
			}
			else {
				video_player_html = html_parse(data)
				log.debug('video player file loaded')
				resolve()
			}
		})
	})
}

export function show() {
	log.debug('showing results in browser')
	
	let cmd_open
	switch (OS_NAME) {
		case 'mac':
			cmd_open = 'open'
			break
			
		case 'win':
			cmd_open = 'start'
			break
			
		default:
			cmd_open = 'open'
			break
	}
	
	process_exec(`${cmd_open} ${path.resolve(VIDEO_PLAYER_PATH)}`)
	
	return Promise.resolve()
}

export function write() {
	return new Promise(function(resolve,reject) {
		if (video_player_html != null) {
			fs.writeFile(VIDEO_PLAYER_PATH, video_player_html.toString(), function(err) {
				if (err) {
					log.error(err)
					reject('results.write.write')
				}
				else {
					log.debug('wrote results to video player')
					resolve()
				}
			})
		}
		else {
			reject('results.write.null')
		}
	})
}

export function clear_videos() {
	return new Promise(function(resolve) {
		let p = null
		if (video_player_html == null) {
			p = load_video_player()
		}
		else {
			p = Promise.resolve()
		}
		
		p.then(function() {
			video_player_html.querySelector('#videos').set_content('')
			resolve()
		})
	})
}

export function add_videos(videos) {
	return new Promise(function(resolve,reject) {
		let multiple = false
		let count = 1
		
		if (videos instanceof Array) {
			multiple = true
			count = videos.length
		}
		
		log.debug(`adding ${count} videos to ${VIDEO_PLAYER_PATH}`)
		
		let p = null
		
		if (video_player_html == null) {
			p = load_video_player()
		}
		else {
			p = Promise.resolve()
		}
		
		p.then(function() {
			const container = video_player_html.querySelector('#videos')
			
			if (multiple) {
				for (let video of videos) {
					container.appendChild(html_parse(video))
				}
			}
			else {
				container.appendChild(html_parse(videos))
			}
			
			log.debug('videos loaded')
			resolve()
		})
		.catch(function(err) {
			reject(err)
		})
	})
}