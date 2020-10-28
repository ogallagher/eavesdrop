/*

Owen Gallagher
20 Oct 2020

*/

// external imports

import debug from 'debug'
import cli_args from 'command-line-args'
import os_locale from 'os-locale'
import fs from 'fs'

// local imports

import {
	PROGRAM_NAME,
	set_program_name,
	TEMP_DIR_PATH,
	VIDEO_PATH_PREFIX,
	JSON_FILETYPE
} from './consts.js'

import Logger from './logger.js'

import {
	init_loggers,
	get_config,
	reduce_video_details,
	finish as finish_util
} from './util.js'

import {
	init as init_api_client,
	ApiClient
} from './api_client.js'

import {
	CaptionsReader
} from './read_captions.js'

import {
	compile_video_embed
} from './results.js'

// constants

const NAME = PROGRAM_NAME + ':child'
const log = new Logger(NAME)
const is_child = (typeof process.send == 'function')

let language = 'en'
os_locale()
.then((locale) => {
	language = locale.substring(0,2)
})

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
	},
	{
		name: 'query',
		alias: 'q',
		type: String,
		defaultValue: ''
	}
]

// variables

let tasks = []
let task_args = {}

// methods

if (process.send == undefined) {
	process.send = function(arg) {
		log.info(`process.send(${JSON.stringify(arg)}) ignored`)
	}
}

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
			captions-download
			captions-read
			videos-details
		]
		
	(-q | --query) <query>=\'\'
		<query> = search terms for captions-read
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
		
		//task-specific arguments
		task_args.query = options.query
		
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

// test_message() not finished
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

// get_reply() not finished
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

function captions_download() {
	return new Promise(function(resolve,reject) {	
		init_api_client()
		.then(() => {
			log.debug('initialized api_client module')
			let api_client = new ApiClient()
			
			let done = false
			let idle = false
			
			// get video_id
			process.on('message', function(msg) {
				if (msg.video_ids != undefined) {
					idle = false
					
					// get captions
					let promises = []
					for (let video_id of msg.video_ids) {
						let p = api_client.youtube_timedtext_download(video_id)
						.then(function(ttxt_path) {
							log.info(`downloaded timedtext to ${ttxt_path}`)
							
							if (ttxt_path) {
								// send finished video to parent process
								let result = {
									ttxt_path: ttxt_path,
									video_id: video_id
								}
								
								process.send(result)
							}
							else {
								process.send('error:captions_download.path')
							}
						})
						.catch(function(err) {
							let out = `failed to get timedtext for ${video_id}`
							log.error(out)
							process.send(out)
							process.send(err)
						})
						.finally(() => {
							return Promise.resolve()
						})
						
						promises.push(p)
					}
					
					Promise.all(promises)
					.finally(function() {
						log.info(`timedtext download to ${TEMP_DIR_PATH} complete for ${msg.video_ids}`)
						
						if (done) {
							resolve()
						}
						else {
							idle = true
						}
					})
					process.send('video_ids ' + msg.video_ids.join(',') + ' received')
				}
				else if (msg.done) {
					log.info('no more captions to download')
					process.send('quitting when done')
					
					if (idle) {
						resolve()
					}
					else {
						done = true
					}
				}
				else {
					process.send(`message ${JSON.stringify(msg)} not understood`)
				}
			})
		})
		.catch(function(err) {
			log.error(err)
			log.error('failed to initialize api client')
			reject('captions_download.api')
		})
	})
}

function videos_details() {
	return new Promise(function(resolve,reject) {
		init_api_client()
		.then(() => {
			log.debug('initialized api_client module')
			let api_client = new ApiClient()
			
			let done = false //true for testing
			let idle = false
			
			// // for testing
			// let msg = {
			// 	video_ids: ['iFHpBHGLs7M','FxseCMPrOkU','YGO-C8yRzhA','xW-_gvmDwTc','qljJuhzaabk']
			// }
			
			// get video ids
			
			process.on('message', function(msg) {
				if (msg.video_ids != undefined) {
					idle = false
					process.send('video_ids received: ' + msg.video_ids.join(','))
					
					api_client.youtube_videos_list(msg.video_ids)
					.then(function(res) {
						let fs_write_promises = []
						
						for (let video_item of res.data.items) {
							// write video to file
							let video = reduce_video_details(video_item)
							let video_id = video.id
							let video_path = VIDEO_PATH_PREFIX + video_id + '.' + JSON_FILETYPE
							
							// stringify video
							video = JSON.stringify(video, null, '\t')
							
							let fs_write_promise = new Promise(function(fs_resolve) {
								fs.writeFile(video_path, video, function(err) {
									if (err) {
										log.error('failed to write to ' + video_path)
										process.send('error:fs.write for ' + video_id)
									}
									else {
										log.info('saved video details in ' + video_path)
									
										// send vido file to parent process
										process.send({
											video_path: video_path,
											video_id: video_id
										})
									}
									
									fs_resolve()
								})
							})
							
							fs_write_promises.push(fs_write_promise)
						}
						
						Promise.all(fs_write_promises)
						.catch(function(err) {
							log.error(err)
							process.send('error:' + err)
						})
						.finally(() => {
							log.info('finished downloading details for ' + msg.video_ids.join(','))
						
							if (done) {
								process.send('quitting')
								resolve()
							}
							else {
								idle = true
							}
						})
					})
					.catch(function(err) {
						log.error(err)
						log.error('failed to download videos for ids ' + msg.video_ids.join(','))
						process.send('error:' + err)
					})
				}
				else if (msg.done) {
					log.info('no more videos to download')
					process.send('quitting when done')
					
					// wait to set kill signal while communications catch up
					// setTimeout(() => {
						if (idle) {
							process.send('quitting')
							resolve()
						}
						else {
							done = true
						}
					// }, 10000)
				}
				else {
					let out = 'unknown message ' + JSON.stringify(msg)
					log.error(out)
					process.send('error:' + out)
				}
			})
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
		log.debug('initialized captions-read eavesdrop child')
		log.info(`search terms = ${task_args.query}`)
		
		// {video_id: {video_path:, start_sec:}, ...}
		let idle_video = false
		let idle_start = false
		let done = false
		let results = {}
		
		function try_compile_result(result) {
			return new Promise(function(resolve_compile) {
				if (result.video_path !== undefined && result.start_sec !== undefined) {
					log.info(`ready to compile ${result.video_path} embed starting at ${result.start_sec}`)
					
					if (result.start_sec == -1) {
						log.info(result.video_path + ' is not a result')
						resolve_compile()
					}
					else {
						fs.readFile(result.video_path, 'utf-8', function(err, data) {
							compile_video_embed(JSON.parse(data), result.start_sec)
							.then(function(video_embed) {
								log.debug('sent video embed ' + video_embed)
								process.send({
									video_embed: video_embed
								})
							})
							.catch(function(err) {
								log.error(err)
								process.send('error:' + err)
							})
							.finally(resolve_compile)
						})
					}
				}
				else {
					resolve_compile()
				}
			})
		}
		
		function add_video_path(video_id, video_path) {
			return new Promise(function(resolve_add_path) {
				if (results[video_id] == undefined) {
					results[video_id] = {}
				}
			
				results[video_id].video_path = video_path
			
				try_compile_result(results[video_id])
				.then(resolve_add_path)
			})
		}
		
		function add_start_sec(video_id, start_sec) {
			return new Promise(function(resolve_add_start) {
				if (results[video_id] == undefined) {
					results[video_id] = {}
				}
			
				results[video_id].start_sec = start_sec
			
				try_compile_result(results[video_id])
				.then(resolve_add_start)
			})
		}
		
		let reader = new CaptionsReader(task_args.query)
		
		process.on('message', function(msg) {
			if (msg.video_path != undefined) {
				idle_video = false
				log.info(`received video file path ${msg.video_path} with embed html`)
				
				add_video_path(msg.video_id, msg.video_path)
				.finally(() => {
					if (done && idle_start) {
						process.send('quitting')
						resolve()
					}
					else {
						idle_video = true
					}
				})
			}
			else if (msg.ttxt_path != undefined) {
				idle_start = false
				log.info(`received timedtext file path ${msg.ttxt_path} to read for search terms`)
				
				reader.find_query(msg.ttxt_path)
				.then(function(start_sec) {
					if (start_sec == -1) {
						log.warning(`query not found in ${msg.ttxt_path}`)
					}
					else {
						let out = `found query in ${msg.ttxt_path} at start=${start_sec}`
						log.info(out)
						process.send(out)
					}
					
					return add_start_sec(msg.video_id, start_sec)
				})
				.catch(function(err) {
					log.error(`failed to search for query in ${msg.ttxt_path}`)
					return add_start_sec(msg.video_id, -1)
				})
				.finally(() => {
					if (done && idle_video) {
						process.send('quitting')
						resolve()
					}
					else {
						idle_start = true
					}
				})
			}
			else if (msg.done) {
				log.info('searching the last captions')
				
				// wait to set kill signal while communications catch up
				setTimeout(() => {
					if (idle_video && idle_start) {
						process.send('quitting')
						resolve()
					}
					else {
						done = true
					}
				}, 3000)
			}
			else {
				let out = `message ${JSON.stringify(msg)} not understood`
				log.error(out)
				process.send('error:' + out)
			}
		})
	})
}

function main() {
	parse_cli_args()

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
		else if (task == 'captions-download') {
			p = captions_download()
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
	.catch(function(err) {
		log.error(err)
		process.send({
			error: err
		})
	})
	.finally(() => {
		log.info('all tasks complete')
		finish_util()
		process.exit()
	})
}

// main / default export

if (process.argv.length > 1 && process.argv[1].endsWith('eavesdrop_child.js')) {
	main()
}

export default main