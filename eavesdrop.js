/*

Owen Gallagher
2020-10-13

*/

// external imports

import fs from 'fs'

import debug from 'debug'

import cli_args from 'command-line-args'

import { 
	fork as process_fork 
} from 'child_process'

// local imports

import { 
	PROGRAM_NAME,
	LOG_LEVEL,
	TOTAL_RESULTS_MAX,
	config as config_consts 
} from './consts.js'

import {
	init_loggers,
	get_config,
	finish as finish_util,
	eavesdrop_commands_help
} from './util.js'

import Logger from './logger.js'

import {
	ask,
	init_translation
} from './io.js'

import { 
	test_tests,
	test_filesystem,
	test_parallel,
	test_parallel_messages,
	test_request,
	test_translation,
	test_api_youtube_search,
	test_api_youtube_videos,
	test_api_youtube_captions,
	test_api_youtube_captions_download,
	test_api_youtube_timedtext_download,
	test_results_show,
	test_results,
	test_promise_assign_outer
} from './tests.js'

import {
	CMD_PREFIX
} from './consts.js'

import {
	init as init_api_client,
	config as config_api_client,
	finish as finish_api_client,
	ApiClient
} from './api_client.js'

// constants

const NAME = PROGRAM_NAME
export const log = new Logger(NAME)

const cli_args_api = [
	{
		name: 'logging',
		alias: 'l',
		type: String,
		defaultValue: 'info'
	},
	{
		name: 'test',
		alias: 't',
		type: Boolean,
		defaultValue: false
	},
	{
		name: 'help',
		alias: 'h',
		type: Boolean,
		defaultValue: false
	},
	{
		name: 'tests',
		alias: 'T',
		type: String,
		defaultValue: ''
	},
	{
		name: 'language',
		alias: 'L',
		type: String,
		defaultValue: ''
	}
]

// variables

let do_tests = false
let test_selection = []
let locale = undefined

// methods

function eavesdrop_help() {
	log.debug('showing help messages')
	
	return `
cli args:
	(-l | --logging) <level>

	(-L | --language) <locale>
		<locale> = locale name (language-region combination; ex. en-US)
	
	(-t | --test)

	(-T | --tests) <test-selection>
		<test-selection> = comma-separated list of:
		[
			all
			tests
			filesystem
			parallel
			parallel-messages
			request
			translation
			api-youtube-search
			api-youtube-videos
			api-youtube-captions
			api-youtube-captions-download
			api-youtube-timedtext-download
			results-show
			results
			promise-assign-outer
		]

	(-h | --help)
	
${eavesdrop_commands_help()}
`
}

function parse_cli_args() {
	let options = cli_args(cli_args_api)
	
	if (options.help) {
		console.log(eavesdrop_help())
		finish()
		process.exit()
	}
	else {
		// set logging levels
		init_loggers(options.logging)
		
		log.info('parsing cli args')
		log.debug(options)
	
		log.info('set logging level to ' + options.logging)
		
		// set locale
		if (options.language != '') {
			locale = options.language
		}
		
		// testing
		if (options.test || options.tests != '') {
			do_tests = true
			
			if (options.tests == '' || options.tests == 'all') {
				test_selection = ['all']
			}
			else {
				test_selection = options.tests.split(',')
			}
			
			log.info('testing enabled: ' + test_selection)
		}
	}
}

function config() {
	return new Promise(function(resolve,reject) {
		// init from config file
		get_config()
		.then(function(config) {
			config_consts(config)
		
			config_api_client(config)
			
			resolve()
		})
		.catch(function() {
			log.warning('no configuration file found')
			reject('eavesdrop.config.file')
		})
	})
}

function tests() {
	return new Promise(function(resolve,reject) {
		let test_promises = [] //array of promises
		let all_tests = test_selection.includes('all')
		
		if (all_tests || test_selection.includes('tests')) {
			//tests module
			log.info('testing tests')
			test_promises.push(test_tests())
		}
		
		if (all_tests || test_selection.includes('filesystem')) {
			//filesystem
			log.info('testing filesystem')
			test_promises.push(test_filesystem())
		}
		
		if (all_tests || test_selection.includes('parallel')) {
			//parallel fork
			log.info('testing parallelization')
			test_promises.push(test_parallel())
		}
		
		if (all_tests || test_selection.includes('parallel-messages')) {
			//parallel fork with detached children
			log.info('testing parallelization with message-passing')
			test_promises.push(test_parallel_messages())
		}
		
		if (all_tests || test_selection.includes('request')) {
			//request
			log.info('testing http request to pull webpage')
			test_promises.push(test_request())
		}
		
		if (all_tests || test_selection.includes('translation')) {
			//translation
			log.info('testing translation')
			test_promises.push(test_translation())
		}
		
		if (all_tests || test_selection.includes('api-youtube-search')) {
			//api: youtube search
			log.info('testing api client youtube search')
			test_promises.push(test_api_youtube_search())
		}
		
		if (all_tests || test_selection.includes('api-youtube-videos')) {
			//api: youtube videos list
			log.info('testing api client youtube videos list')
			test_promises.push(test_api_youtube_videos())
		}
		
		if (all_tests || test_selection.includes('api-youtube-captions')) {
			//api: youtube captions list
			log.info('testing api client youtube captions list')
			test_promises.push(test_api_youtube_captions())
		}
		
		if (all_tests || test_selection.includes('api-youtube-captions-download')) {
			//api: youtube captions download
			log.info('testing api client youtube captions download')
			test_promises.push(test_api_youtube_captions_download())
		}
		
		if (all_tests || test_selection.includes('api-youtube-timedtext-download')) {
			//api: youtube timedtext download
			test_promises.push(test_api_youtube_timedtext_download())
		}
		
		if (all_tests || test_selection.includes('results-show')) {
			//results: show
			log.info('testing results preview')
			test_promises.push(test_results_show())
		}
		
		if (all_tests || test_selection.includes('results')) {
			//results: show
			log.info('testing results clear, update, write, and show')
			test_promises.push(test_results())
		}
		
		if (all_tests || test_selection.includes('promise-assign-outer')) {
			// promise assign to variable in outer scope
			log.info('testing assignment to variable in outer scope from within promise')
			
			let iterations = 3
			let p = Promise.resolve()
			for (let i=0; i<iterations; i++) {
				p = p.then(
					test_promise_assign_outer()
				)
			}
			
			test_promises.push(p)
		}
		
		Promise.all(test_promises)
		.then(function() {
			resolve()
		})
		.catch(function(failures) {
			reject(failures)
		})
	})
}

function eavesdrop_children() {
	log.info('launching eavesdrop child processes')
	
	log.debug('launching captions list child')
	let captions_list_child = process_fork(
		'eavesdrop_child.js', 
		[
			'--logging', log.level, 
			'--do', 'captions-list-download'
		]
	)
	captions_list_child.on('message', function(msg) {
		log.debug('captions-list-download:' + msg)
	})
	captions_list_child.on('exit', function(code,signal) {
		log.info(`captions-list-download child exited with code ${code}, signal ${signal}`)
	})
	captions_list_child.on('error', function(err) {
		log.error(err)
		reject('eavesdrop_children.captions-list-download')
	})
	
	log.debug('launching videos details child')
	let videos_details_child = process_fork(
		'eavesdrop_child.js',
		[
			'--logging', log.level,
			'--do', 'videos-details'
		]
	)
	videos_details_child.on('message', function(msg) {
		log.debug('videos-details:' + msg)
	})
	videos_details_child.on('exit', function(code,signal) {
		log.info(`videos-details child exited with code ${code}, signal ${signal}`)
	})
	videos_details_child.on('error', function(err) {
		log.error(err)
		reject('eavesdrop_children.videos-details')
	})
	
	log.debug('launching captions read child')
	let captions_read_child = process_fork(
		'eavesdrop_child.js',
		[
			'--logging', log.level,
			'--do', 'captions-read'
		]
	)
	captions_read_child.on('message', function(msg) {
		log.debug('captions-read:' + msg)
	})
	captions_read_child.on('exit', function(code,signal) {
		log.info(`captions-read child exited with code ${code}, signal ${signal}`)
	})
	captions_read_child.on('error', function(err) {
		log.error(err)
		reject('eavesdrop_children.captions-read')
	})
	
	return {
		captions_list: captions_list_child,
		videos_details: videos_details_child,
		captions_read: captions_read_child
	}
}

function eavesdrop() {
	let api_client = new ApiClient()
	
	return new Promise(function(resolve) {
		ask('\ninput a phrase you\'d like to hear.\n')
		.then(function(phrase) {
			if (phrase) {
				log.info('phrase = ' + phrase)
				
				// spawn child processes
				let children = eavesdrop_children()
				
				// get video ids matching phrase
				let page = undefined
				let more_pages = true
				let total_results = 0
				let search_p = api_client.youtube_search(phrase)
				
				while (more_pages) {
					search_p = search_p
					.then(function(res) {
						// res = {data,next_page,prev_page}
						let num_results = res.data.items.length
						total_results += num_results
						log.debug(`got ${num_results} video ids for page ${page}`)
						
						// pass video ids to captions-list
						let video_ids = []
						for (let id of res.data.items) {
							video_ids.push(id.videoId)
						}
						
						children.captions_list.send({
							video_ids: video_ids
						})
						
						// pass video ids to videos-details
						
						// captions-list will pass
						
						if (res.next_page && total_results < TOTAL_RESULTS_MAX) {
							// advance to next results page
							page = res.next_page
						}
						else {
							// finish
							log.info(`found ${total_results} candidate videos`)
							more_pages = false
						}
					})
					.catch(function(err) {
						log.error(err)
						log.info(`skipping search results for page ${page}`)
						more_pages = false
					})
				}
				
				// send "video ids search done" message to children
				let done = {
					done: true
				}
				children.captions_list.send(done)
				children.videos_details.send(done)
				
				resolve()
			}
			else {
				eavesdrop()
				.then(resolve)
			}
		})
	})
}

function main() {
	console.log('=== EAVESDROP ===\n')
	
	try {
		parse_cli_args()
		
		config()
		.then(() => {
			return init_translation(locale)
		})
		.then(function() {
			log.debug('initialized translation module')
		})
		.catch(function(e) {
			log.error(e)
		
			if (e instanceof String) {
				if (e.startsWith('eavesdrop.config')) {
					log.error('failed to read from config file')
				}
				else if (e.startsWith('io')) {
					log.error('failed to initialize translation module')
				}
				else {
					log.error('unknown error')
				}
			}
			else {
				log.error('unknown error')
			}
		})
		.finally(function() {
			init_api_client()
			.then(function() {
				log.debug('initialized api_client module')
			})
			.catch(function(e) {
				log.error('failed to initialize api_client module')
				log.error(e)
			})
			.finally(function() {
				if (do_tests) {
					tests()
					.then(function() {
						log.info('all tests passed')
			
						eavesdrop()
						.finally(finish)
					})
					.catch(function(failures) {
						if (failures.length instanceof Array) {
							log.error(`${failures.length} tests failed: ${failures}`)
						}
						else {
							log.error(`one test failed: ${failures}`)
						}
				
						finish()
					})
				}
				else {
					log.info('running eavesdrop without tests')
		
					eavesdrop()
					.finally(finish)
				}
			})
		})
	}
	catch (e) {
		log.error(e)
		log.error('failed to parse cli args')
	}
}

export function finish() {
	return new Promise(function(resolve) {
		finish_api_client()
		.catch(function(err) {
			log.error(err)
			log.error('api_client module failed cleanup')
		})
		.finally(() => {
			finish_util()
			console.log('\n=== DONE ===')
			resolve()
		})
	})
}

// main / exports

if (process.argv.length > 1 && process.argv[1].endsWith('eavesdrop.js')) {
	main()
}

export default main