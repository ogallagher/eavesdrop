/*

Owen Gallagher
20 Oct 2020

*/

// external imports

import debug from 'debug'
import cli_args from 'command-line-args'
import os_locale from 'os-locale'

// local imports

import {
	PROGRAM_NAME,
	set_program_name,
	TEMP_DIR_PATH
} from './consts.js'

import Logger from './logger.js'

import {
	init_loggers,
	get_config,
	finish as finish_util
} from './util.js'

import {
	init as init_api_client,
	ApiClient
} from './api_client.js'

// constants

const NAME = PROGRAM_NAME + ':child'
const log = new Logger(NAME)
const is_child = (typeof process.send == 'function')
let language = os_locale().substring(0,2)

const cli_args_api = [
	{
		name: 'logging',
		alias: 'l',
		type: String,
		defaultValue: 'info'
	},
	{
		name: 'do',
		alias: 'd',
		type: String,
		defaultValue: 'help'
	},
	{
		name: 'help',
		alias: 'h',
		type: Boolean,
		defaultValue: false
	}
]

// variables

let tasks = []
let messages = []

// methods

function show_help() {
	console.log(`\
This is a module containing methods that can be invoked by an eavesdrop
parent process.
		
	(-h | --help)
		
	(-l | --logging) <level>=\'info\'
		
	(-d | --do) <task-selection>=\'help\'
		<task-selection> = [
			help
			test-parallel
			test-message
			captions-list-download
			captions-read
			videos-details
		]
	`)
}

function parse_cli_args() {
	let options = cli_args(cli_args_api)
	
	if (options.help) {
		show_help()
	}
	else {
		// set logging levels
		log.enable(options.logging)
		init_loggers(options.logging)
		
		log.debug('parsing cli args')
		log.debug(options)
		
		log.debug('set logging level to ' + options.logging)
		
		//tasks
		if (options.do == '' || options.do == 'all') {
			tasks = ['all']
		}
		else {
			tasks = options.do.split(',')
		}
		
		log.info('will do tasks: ' + tasks)
	}
}

function test_parallel() {
	let pid = process.pid
	log.debug(`eavesdrop child process = ${pid}`)
	
	log.debug('performing simple task')
	let str = ''
	let j=0
	for (let i=0; i<1000; i++) {
		if (i % 10 == 0) {
			str += '..........' + i
		}
		else {
			let temp = str.split('')
			temp[j++] = '?'
			str = temp.join('')
		}
	}
	
	if (is_child) {
		process.send(str)
		log.debug(`eavesdrop child ${pid} complete`)
	}
	else {
		log.warning('child has no parent process')
	}
}

function test_message() {
	return new Promise(function(resolve,reject) {
		let pid = process.pid
		log.debug(`eavesdrop child process = ${pid}`)
		
		log.info('asking a question')
		if (is_child) {
			process.send('log:asking a question')
			process.send('ask:what shall I tell the parent?')
			get_reply()
			.then(function(answer) {
				process.sent('say:' + answer)
				resolve()
			})
			.catch(function(err) {
				log.error(err)
				if (is_child) {
					process.send('error:test_detached.ask')
					process.send(err)
				}
				reject('test_detached.ask')
			})
		}
		else {
			log.error('no parent process found')
			reject('test_detached.parent')
		}
	})
}

function on_message(msg) {
	log.info('received message from parent: ' + msg)
	messages.push(new String(msg).toString())
}

function get_reply(timeout=5000) {
	return new Promise(function(resolve,reject) {
		let found_reply = false
		setTimeout(function() {
			for (let message of messages) {
				if (message.startsWith('reply:')) {
					resolve(message)
					break
				}
			}
			
			if (!found_reply) {
				reject('get_reply.no_reply')
			}
			else {
				messages = []
			}
		}, timeout)
	})
}

function captions_list_download() {
	return new Promise(function(resolve,reject) {
		init_api_client()
		.then(() => {
			log.debug('initialized api_client module')
			let api_client = new ApiClient()
			go = true
			
			// get video_id
			process.on('message', function(msg) {
				if (msg.video_ids != undefined) {
					// get captions
					let promises = []
					
					for (let video_id of msg.video_ids) {
						let p = api_client.youtube_captions_list(video_id)
						.then(function(data) {
							let num_results = data.items.length
							log.debug(`fetched ${num_results} captions`)
							
							if (num_results > 0) {
								// pick best captions
								let best_captions = data.items[0]
								let best_lang = best_captions.snippet.language
								let best_kind = best_captions.snippet.trackKind
								for (let i=1; i<num_results; i++) {
									let captions = data.items[i]
									let lang = captions.snippet.language
									let kind = captions.snippet.trackKind
									
									if ((best_lang != language && lang == language) || 
										(best_kind != kind && kind == 'standard')) {
										best_captions = captions
										best_lang = lang
									}
								}
								
								// download captions
								return api_client.youtube_captions_download(best_captions.id,video_id)
								.then(function(path) {
									log.debug(`downloaded captions for ${best_captions.id}`)
								})
								.catch(function(err) {
									log.error(err)
									log.error(`failed to download captions for ${best_captions.id}`)
								})
								.finally(function() {
									return Promise.resolve()
								})
							}
							else {
								return Promise.reject(video_id)
							}
						})
						.catch(function(err) {
							return Promise.reject(video_id)
						})
						
						promises.push(p)
					}
					
					Promise.all(promises)
					.catch(function(video_ids) {
						log.error(`failed to get captions for ${video_ids}`)
					})
					.finally(function() {
						log.info(`captions download to ${TEMP_DIR_PATH} complete`)
					})
				}
				else if (message.done) {
					go = false
				}
			})
		})
		.catch(function(err) {
			log.error(err)
			log.error('failed to initialize api client')
			reject('captions_list_download.api')
		})
	})
}

function videos_details() {
	return new Promise(function(resolve,reject) {
		init_api_client()
		.then(() => {
			log.debug('initialized api_client module')
			let api_client = new ApiClient()
			reject('videos_details.undefined')
		})
		.catch(function(err) {
			log.error(err)
			log.error('failed to initialize api client')
			reject('videos_details.api')
		})
	})
}

function captions_read() {
	return new Promise(function(resolve,reject) {
		reject('captions_read.undefined')
	})
}

function main() {
	parse_cli_args()
	
	// process.on('message', on_message)
	
	let promises = []
	
	for (let task of tasks) {
		log.info('performing ' + task)
		
		let p
		if (task == 'help') {
			p = show_help()
		}
		else if (task == 'test-parallel') {
			p = test_parallel()
		}
		else if (task == 'test-message') {
			p = test_message()
		}
		else if (task == 'captions-list-download') {
			p = captions_list_download()
		}
		else if (task == 'captions-read') {
			p = captions_read()
		}
		else if (task == 'videos-details') {
			p = videos_details()
		}
		
		if (p instanceof Promise) {
			promises.push(p)
		}
	}
	
	Promise.all(promises)
	.then(() => {
		log.info('all tasks complete')
		
		process.exit(0)
	})
	.catch(function(err) {
		if (err instanceof Array) {
			log.error(`${err.length} errors failed`)
			log.error(err)
		}
		else {
			log.error(err)
		}
		
		process.exit(1)
	})
}

// main / exports

if (process.argv.length > 1 && process.argv[1].endsWith('eavesdrop_child.js')) {
	main()
}

export default main