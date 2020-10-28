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
	init_filesystem,
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
	test_promise_assign_outer,
	test_captions_reader,
	test_eavesdrop_results
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

import {
	clear_videos as results_clear_videos,
	add_videos as results_add_videos,
	write as results_write,
	show as results_show
} from './results.js'

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
			captions-reader
			eavesdrop-results
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
		
		if (all_tests || test_selection.includes('captions-reader')) {
			//read_captions: CaptionsReader.find_query()
			log.info('testing search for query start time within captions file')
			test_promises.push(test_captions_reader())
		}
		
		if (all_tests || test_selection.includes('eavesdrop-results')) {
			//use start-second found from CaptionsReader.find_query() combined with the embedHTML
			//of the corresponding video details file to load the result into the results page.
			log.info('testing eavesdrop results compilation')
			test_promises.push(test_eavesdrop_results())
		}
		
		let successes = 0
		let failures = 0
		Promise.all(test_promises)
		.then(function() {
			successes++
		})
		.catch(function(failure) {
			log.error('test failed: ' + failure)
			failures++
		})
		.finally(function() {
			if (failures == 0) {
				resolve(successes)
			}
			else {
				reject(failures)
			}
		})
	})
}

function eavesdrop_children(phrase) {
	return new Promise(function(resolve,reject) {
		log.info('launching eavesdrop child processes')
	
		log.debug('launching captions download child')
		let captions_download_child = process_fork(
			'eavesdrop_child.js', 
			[
				'--logging', log.level, 
				'--do', 'captions-download'
			]
		)
	
		log.debug('launching videos details child')
		let videos_details_child = process_fork(
			'eavesdrop_child.js',
			[
				'--logging', log.level,
				'--do', 'videos-details'
			]
		)
	
		log.debug('launching captions read child')
		let captions_read_child = process_fork(
			'eavesdrop_child.js',
			[
				'--logging', log.level,
				'--do', 'captions-read',
				'--query', phrase
			]
		)
		
		console.log('waiting for child processes to have time to start...')
		setTimeout(() => {
			let children = {
				captions_download: captions_download_child,
				videos_details: videos_details_child,
				captions_read: captions_read_child
			}
			
			resolve(children)
		}, 3000)
	})
}

function eavesdrop() {
	let api_client = new ApiClient()
	
	return new Promise(function(resolve,reject) {
		ask('\ninput a phrase you\'d like to hear.\n')
		.then(function(phrase) {
			if (phrase) {
				log.info('phrase = ' + phrase)
				
				// clear old results
				results_clear_videos()
				
				// spawn child processes
				.then(() => {
					return Promise.resolve(eavesdrop_children(phrase))
				})
				
				// eavesdrop
				.then((children) => {
					let captions_download_quit = false
					let videos_details_quit = false
					
					// handle child process communication and events
					children.captions_download.on('message', function(msg) {
						log.debug('captions-download:' + JSON.stringify(msg))
						
						if (msg.ttxt_path != undefined) {
							log.debug('received downloaded timedtext path, passing to captions-read')
							children.captions_read.send(msg)
						}
						else if (msg.error != undefined) {
							log.error('captions-download:' + msg.error)
						}
					})
					children.captions_download.on('exit', function(code,signal) {
						captions_download_quit = true
						log.info(`captions-download child exited with code ${code}, signal ${signal}`)
						
						if (videos_details_quit) {
							setTimeout(() => {
								children.captions_read.send({
									done: true
								})
								log.info('sent done message to captions-read')
							}, 3000)
						}
					})
					children.captions_download.on('error', function(err) {
						log.error(err)
						reject('eavesdrop_children.captions-download')
					})
					
					children.videos_details.on('message', function(msg) {
						log.debug('videos-details:' + JSON.stringify(msg))
						
						if (msg.video_path != undefined) {
							//should include video_id as well
							log.debug('received video details path, passing to captions-read')
							children.captions_read.send(msg)
						}
						else if (msg.error != undefined) {
							log.error('video-details:' + msg.error)
						}
					})
					children.videos_details.on('exit', function(code,signal) {
						videos_details_quit = true
						log.info(`videos-details child exited with code ${code}, signal ${signal}`)
						
						if (captions_download_quit) {
							setTimeout(() => {
								children.captions_read.send({
									done: true
								})
								log.info('sent done message to captions-read')
							}, 3000)
						}
					})
					children.videos_details.on('error', function(err) {
						log.error(err)
						reject('eavesdrop_children.videos-details')
					})
					
					let results_promises = []
					children.captions_read.on('message', function(msg) {
						log.debug('captions-read:' + JSON.stringify(msg))
						
						if (msg.video_embed != undefined) {
							log.debug('received video result embed html, adding to results')
							log.info(`adding video: ${msg.video_embed}`)
							
							let p = results_add_videos(msg.video_embed)
							results_promises.push(p)
						}
						else if (msg.error != undefined) {
							log.error('captions-read:' + msg.error)
						}
					})
					children.captions_read.on('exit', function(code,signal) {
						log.info(`captions-read child exited with code ${code}, signal ${signal}`)
						
						Promise.all(results_promises)
						.catch(function(err) {
							log.error(err)
						})
						.finally(function() {
							log.info('eavesdrop search complete! showing results')
							results_write()
							.then(results_show)
							.catch(function(err) {
								log.error(err)
								log.error('failed to commit and show results page')
							})
							.finally(resolve)
						})
					})
					children.captions_read.on('error', function(err) {
						log.error(err)
						reject('eavesdrop_children.captions-read')
					})
					
					// get video ids matching phrase
					
					let page = undefined
					let more_pages = true
					let total_results = 0
					
					function next_page(p) {
						return new Promise((resolve_page) => {
							p.then(function(res) {
								// res = {data,next_page,prev_page}
								let num_results = res.data.items.length
								total_results += num_results
								log.info(`got ${num_results} candidates for page ${page}`)
								
								// pass video ids to captions-list and video-details
								let video_ids = []
								for (let video_item of res.data.items) {
									video_ids.push(video_item.id.videoId)
								}
								
								/*
								captions-download will create ttxt xml files and return filepaths, 
								which will be passed to captions-read to determine if the phrase is 
								spoken.
								*/
								children.captions_download.send({
									video_ids: video_ids
								})
								
								/*
								videos-details will create video json files and return filepaths, 
								which will be used by captions-read to create the video embed 
								iframes.
								*/
								children.videos_details.send({
									video_ids: video_ids
								})
								
								if (res.next_page && total_results < TOTAL_RESULTS_MAX) {
									// advance to next results page
									page = res.next_page
									
									next_page(api_client.youtube_search(phrase,page))
									.then(resolve_page)
								}
								else {
									// finish
									log.info(`found ${total_results} candidate videos`)
									resolve_page()
								}
							})
							.catch(function(err) {
								log.error(err)
								log.info(`skipping search results for page ${page}`)
								resolve_page()
							})
						})
					}
					
					function test_page() {
						return new Promise(function(resolve) {
							let video_ids = [
								'kky36rS-4-k','UEzz7Sg_8mc','sN883IakPSw','t2zP7Zxb-iM',
								'FRLmtH8JFEw','AExg1y740Os','MIwd505f0U8','HhdNScqy26c',
								't8FanZG9paU','dE3UzmnpcvQ','dB2OG7UYu1k','ZVVgw8MUjyU',
								'vr4klURswVg','Ud8c03yekq0','rWAnqhw4uyU','a276k-8z9HY',
								'3cCFnSeleL0','UsLelSry2ng','iFHpBHGLs7M','FxseCMPrOkU',
								'YGO-C8yRzhA','xW-_gvmDwTc','qljJuhzaabk','br4u3X7TOT4',
								'MBK5Itkom5w'
							]
							
							log.debug(`got ${video_ids.length} video ids for page TEST`)
							
							children.captions_download.send({
								video_ids: video_ids
							})
							
							children.videos_details.send({
								video_ids: video_ids
							})
							
							resolve()
						})
					}
					
					next_page(api_client.youtube_search(phrase,page))
					//test_page()
					.finally(() => {
						// send "video ids search done" message to children
						let done = {
							done: true
						}
						
						children.captions_download.send(done)
						children.videos_details.send(done)
						log.debug('sent done signal to captions-download and video-details')
					})
				})
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
		
		init_filesystem()
		.then(config)
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
				else if (e.startsWith('util.init_filesystem')) {
					log.error('failed to initialize filesystem')
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
					.then(function(num_successes) {
						log.info(`all ${num_successes} tests passed`)
			
						eavesdrop()
						.finally(finish)
					})
					.catch(function(num_failures) {
						log.error(`${num_failures} tests failed`)
				
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