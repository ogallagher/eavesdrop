/*

Owen Gallagher
2020-10-23

*/

// external imports

import fs from 'fs'
import path from 'path'

import html_parse from 'node-html-parser'

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

let html = null

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
				log.debug('video player file loaded')
				html = html_parse(data)
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
	return Promise(function(resolve,reject) {
		if (html != null) {
			fs.writeFile(VIDEO_PLAYER_PATH, html.toString(), function(err) {
				if (err) {
					log.error(err)
					reject('results.write')
				}
				else {
					log.debug('wrote results to video player')
					resolve()
				}
			})
		}
		else {
			reject('results.null')
		}
	})
}

export function clear_videos() {
	return new Promise(function(resolve,reject) {
		if (html != null) {
			html.querySelector('#videos').set_content('')
		}
		
		resolve()
	})
}

export function add_videos(videos) {
	return new Promise(function(resolve,reject) {
		log.debug(`adding ${videos.length} videos to ${VIDEO_PLAYER_PATH}`)
		
		let p
		if (html == null) {
			p = load_video_player()
		}
		else {
			p = Promise.resolve()
		}
		
		p.then(function() {
			const container = html.querySelector('#videos')
			
			if (videos instanceof Array) {
				for (video of videos) {
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