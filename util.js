/*

Owen Gallagher
2020-10-13

*/

// external imports

import fs from 'fs'

// local imports

import {
	PROGRAM_NAME,
	CONFIG_PATH,
	CLI,
	CMD_PREFIX,
	RESOURCES_DIR_PATH,
	TEMP_DIR_PATH,
	USER_RESULTS_DIR_PATH
} from './consts.js'

import Logger from './logger.js'

import { 
	log as test_log
} from './tests.js'

import {
	log as api_log
} from './api_client.js'

import {
	log as io_log
} from './io.js'

import {
	log as results_log
} from './results.js'

import {
	log as read_captions_log
} from './read_captions.js'

import {
	log as eavesdrop_log,
	finish as eavesdrop_finish
} from './eavesdrop.js'

// constants

const NAME = PROGRAM_NAME + ':util'
export const log = new Logger(NAME)

//methods

export function init_loggers(logging_level) {
	log.enable(logging_level)
	test_log.enable(logging_level)
	api_log.enable(logging_level)
	io_log.enable(logging_level)
	results_log.enable(logging_level)
	read_captions_log.enable(logging_level)
	eavesdrop_log.enable(logging_level)
}

export function init_filesystem() {
	return new Promise(function(resolve,reject) {
		//make sure temp dir exists
		let promises = []
		let p
		p = new Promise(function(temp_resolve,temp_reject) {
			fs.mkdir(TEMP_DIR_PATH, function(err,data) {
				let dir_exists = true
				
				if (err) {
					if (err.code == 'EEXIST') {
						log.debug('temp dir exists')
					}
					else {
						dir_exists = false
						log.error('failed to create temp dir at ' + TEMP_DIR_PATH)
					}
				}
				else {
					log.info('created temp dir at ' + TEMP_DIR_PATH)
				}
				
				if (dir_exists) {
					temp_resolve()
				}
				else {
					temp_reject('util.init_filesystem.temp')
				}
			})
		})
		promises.push(p)
		
		p = new Promise(function(usr_resolve,usr_reject) {
			fs.mkdir(USER_RESULTS_DIR_PATH, function(err,data) {
				let dir_exists = true
				
				if (err) {
					if (err.code == 'EEXIST') {
						log.debug('user results dir exists')
					}
					else {
						dir_exists = false
						log.error('failed to create user results dir at ' + USER_RESULTS_DIR_PATH)
					}
				}
				else {
					log.info('created user results dir at ' + USER_RESULTS_DIR_PATH)
				}
				
				if (dir_exists) {
					usr_resolve()
				}
				else {
					usr_reject('util.init_filesystem.user_results')
				}
			})
		})
		promises.push(p)
		
		Promise.all(promises)
		.then(resolve)
		.catch(function(err) {
			reject(err)
		})
	})
}

export function get_config() {
	return new Promise(function(resolve,reject) {
		//make sure resources/config exists
		fs.mkdir(RESOURCES_DIR_PATH, function(err, data) {
			let dir_exists = true
		
			if (err) {
				if (err.code == 'EEXIST') {
					log.debug('resources dir exists')
				}
				else {
					dir_exists = false
					log.error('failed to create resources dir at ' + RESOURCES_DIR_PATH)
				}
			}
			else {
				log.info('created resources dir at ' + RESOURCES_DIR_PATH)
			}
		
			if (dir_exists) {
				fs.readFile(CONFIG_PATH, function(err, data) {
					if (err) {
						log.debug('failed to load config file')
						log.debug(err)
						reject()
					}
					else {
						log.debug('loaded config file successfully')
						resolve(JSON.parse(data))
					}
				})
			}
			else {
				reject()
			}
		})
	})
}

export function write_config(config) {
	return new Promise(function(resolve,reject) {
		fs.writeFile(CONFIG_PATH, JSON.stringify(config,null,'\t'), function(err) {
			if (err) {
				log.error(err)
				reject('util.write_config')
			}
			else {
				resolve()
			}
		})
	})
}

export function finish() {
	CLI.close()
}

export function eavesdrop_commands_help() {
	return `
eavesdrop commands:
	(${CMD_PREFIX}h | ${CMD_PREFIX}help) = show eavesdrop commands

	(${CMD_PREFIX}q | ${CMD_PREFIX}quit) = quit eavesdrop
`
}

export function do_command(cmd) {
	if (cmd == 'h' || cmd == 'help') {
		console.log(eavesdrop_commands_help())
	}
	else if (cmd == 'q' || cmd == 'quit') {
		eavesdrop_finish()
		.then(() => {
			process.exit()
		})
	}
}

export function dummy_res() {
	log.debug('call dummy resolve')
}

export function dummy_rej() {
	log.debug('call dummy reject')
}

export function dummy_fin() {
	log.debug('call dummy finally')
}

export function dummy_call(callback) {
	log.debug('call dummy, then callback')
	callback()
}

export function reduce_video_details(details) {
	try {
		let summary = {
			id: details.id,
			title: details.snippet.title,
			tags: details.snippet.tags,
			caption: details.contentDetails.caption == 'true',
			embed_html: details.player.embedHtml
		}
		
		return summary
	}
	catch (err) {
		log.error('failed to parse video details from ' + JSON.stringify(details))
		log.error(err)
		return details
	}
}
