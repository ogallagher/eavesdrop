/*

Owen Gallagher
2020-10-13

*/

// external imports

import fs from 'fs'
import debug from 'debug'
import os from 'os'
import { fork as process_fork } from 'child_process'
import request from 'request'

// local imports

import { 
	TEST_DIR_PATH,
	PROGRAM_NAME,
	TEMP_DIR_PATH,
	VIDEO_PATH_PREFIX,
	TIMEDTEXT_PATH_PREFIX,
	JSON_FILETYPE,
	TIMEDTEXT_FILETYPE
} from './consts.js'

import {
	dummy_call,
	reduce_video_details
} from './util.js'

import Logger from './logger.js'

import {
	translate,
	translate_n,
	ask
} from './io.js'

import ApiClient from './api_client.js'

import {
	clear_videos as results_clear_videos,
	add_videos as results_add_videos,
	write as results_write,
	show as results_show,
	compile_video_embed
} from './results.js'

import {
	CaptionsReader
} from './read_captions.js'

// constants

const NAME = PROGRAM_NAME + ':tests'
export const log = new Logger(NAME)

// variables

let test_variable = null

// methods

export function test_tests() {
	return new Promise(function(resolve, reject) {
		log.debug('begin tests module test')
		log.warning('this doesn\'t test anything program-related')
		log.debug('tests module testing complete')
		resolve()
	})
}

export function test_filesystem() {
	return new Promise(function(resolve, reject) {
		log.debug('begin filesystem test')
		
		fs.mkdir(TEST_DIR_PATH, function(err) {
			let dir_exists = true
			
			if (err) {
				if (err.code == 'EEXIST') {
					log.info('found existing test directory')
				}
				else {
					dir_exists = false
					log.error('failed to create test dir at ' + TEST_DIR_PATH)
				}
			}
			else {
				log.info('created test directory at ' + TEST_DIR_PATH)
			}
			
			if (dir_exists) {
				fs.rmdir(TEST_DIR_PATH, function(err) {
					if (err) {
						log.error('failed to remove test dir from ' + TEST_DIR_PATH)
						log.error(err)
						reject('tests.filesystem.rmdir')
					}
					else {
						log.info('removed test directory from ' + TEST_DIR_PATH)
						resolve()
					}
				})
			}
			else {
				reject('tests.filesystem.mkdir')
			}
		})
	})
}

export function test_parallel() {
	return new Promise(function(resolve, reject) {
		log.debug('begin parallelization test')
	
		let cpu_count = os.cpus().length
		log.info(`detected ${cpu_count} cpus; launching ${cpu_count} child processes`)
	
		let success_count = 0
		
		for (let i=0; i<cpu_count; i++) {
			let child = process_fork(
				'eavesdrop_child.js', 
				[
					'--logging', log.level, 
					'--do', 'test-parallel'
				]
			)
			
			child.on('message', function(msg) {
				log.info(`received message of ${msg.length} chars from ${child.pid}`)
				log.debug(msg)
			})
			child.on('exit', function(code,signal) {
				log.info(`child ${child.pid} exited with code ${code}, signal ${signal}`)
				success_count++
				
				if (success_count >= cpu_count) {
					resolve()
				}
			})
			child.on('error', function(err) {
				log.error(err)
				reject('tests.parallel.fork')
			})
		}
	})
}

export function test_parallel_messages() {
	return new Promise(function(resolve, reject) {
		log.debug('begin messaging parallelization test')
		log.warning('this test has not been debugged to work')
		
		let cpu_count = os.cpus().length
		cpu_count = 1
		log.info(`detected ${cpu_count} cpus; launching ${cpu_count} child processes`)
		
		let success_count = 0
		
		for (let i=0; i<1; i++) {
			let child = process_fork(
				'eavesdrop_child.js', 
				[
					'--logging', log.level, 
					'--do', 'test-message'
				]
			)
			
			child.on('message', function(msg) {
				msg = new String(msg)
				if (msg.startsWith('ask:')) {
					ask(`${child.pid}:${msg}`)
					.then(function(reply) {
						log.debug(`sending ${reply} to child ${child.pid}`)
						child.send(`reply:${reply}`)
					})
					.catch(function(err) {
						log.error(err)
						reject('test.parallel_messages.reply')
					})
				}
				else {
					log.info(msg.toString())
				}
			})
			child.on('exit', function(code,signal) {
				log.info(`child ${child.pid} exited with code ${code}, signal ${signal}`)
				success_count++

				if (success_count >= cpu_count) {
					resolve()
				}
			})
			child.on('error', function(err) {
				log.error(err)
				reject('tests.parallel_detached.fork')
			})
		}
	})
}

export function test_request() {
	return new Promise(function(resolve,reject) {
		log.debug('begin http request test')
		
		let test_url = 'https://github.com/ogallagher'
		log.debug('GET request to ' + test_url)
		request(test_url, function(err, res, body) {
			if (err) {
				log.error(err)
				reject('tests.request.get')
			}
			else {
				log.debug('status code = ' + res.statusCode)
				log.debug(body.substring(0,200))
				resolve()
			}
		})
	})
}

export function test_translation() {
	return new Promise(function(resolve,reject) {
		try {
			let locales = [undefined, 'en','es']
			
			log.warning('translation test does not yet self-evaluate')
			for (let locale of locales) {
				log.info(`begin translation test for ${locale}`)
		
				let phrase_plain = 'let\'s see how a plain phrase translates (without constants or numbers)'
				log.info(translate(phrase_plain,undefined,locale))
				
				let phrase_constants = 'this is a translation test for {{program}}, created by {{author}}'
				let constants = {
					program: PROGRAM_NAME,
					author: 'Owen'
				}
				log.info(translate(phrase_constants,constants,locale))
			
				let phrases_numbers = [
					'there is %s fish',
					'in %s fishbowl',
					'and %s person observing it'
				]
				let numbers = [0,1,2,10]
				for (let number of numbers) {
					log.debug('testing numeric phrase translation with ' + number)
					let translated_numbers = []
					
					for (let phrase of phrases_numbers) {
						translated_numbers.push(translate_n(phrase,number,locale))
					}
				
					log.info(translated_numbers.join(' '))
				}
			}
			
			resolve()
		}
		catch (err) {
			log.error(err)
			reject('tests.translation.exception')
		}
	})
}

export function test_api_youtube_search() {
	return new Promise(function(resolve, reject) {
		let api_client = new ApiClient()
		
		// temporarily reduce page size for testing
		let restore_search_results_max = api_client.search_results_max
		api_client.search_results_max = 5
		
		let num_requests = 3
		let query = 'something'
		log.debug(`testing youtube_api search with query=${query} and num_requests=${num_requests}`)
		
		let go = true
		let page_token = undefined
		let p = api_client.youtube_search(query,page_token)
		for (let r=0; r<num_requests && go; r++) {
			p = p.then(function(res) {
				if (res) {
					log.info(`${r}: fetched ${res.data.items.length} results for page ${page_token}`)
					
					for (let item of res.data.items) {
						log.debug(item)
					}
					
					page_token = res.next_page
				}
				
				if (r < num_requests) {
					return api_client.youtube_search(query,page_token)
				}
				else {
					return Promise.resolve()
				}
			})
			.catch(function(err) {
				go = false
				log.error(err)
				return Promise.reject('tests.api_youtube_search')
			})
		}
		
		p.then(function(res) {
			api_client.search_results_max = restore_search_results_max
			resolve()
		})
		.catch(function(err) {
			log.error(err)
			reject('tests.api_youtube_search')
		})
	})
}

export function test_api_youtube_videos() {
	return new Promise(function(resolve,reject) {
		let api_client = new ApiClient()
		
		let video_ids = ['UelDrZ1aFeY','Xl-BNTeJXjw','MZ3Vh8jZFdE','zVO5xTAbxm8']
		log.debug(`testing youtube_api videos list with ids = ${video_ids}`)
		
		api_client.youtube_videos_list(video_ids)
		.then(function(res) {
			log.info(`fetched ${res.data.items.length} videos`)
			
			let promises = []
			
			for (let video of res.data.items) {
				video = reduce_video_details(video)
				log.debug(video)
				
				let video_path = VIDEO_PATH_PREFIX + video.id + '.' + JSON_FILETYPE
				
				let p = new Promise(function(resolve) {
					fs.writeFile(video_path, JSON.stringify(video,null,'\t'), function(err) {
						if (err) {
							log.error('failed to write to ' + video_path)
						}
						else {
							log.info('saved video details in ' + video_path)
						}
						resolve()
					})
				})
				
				promises.push(p)
			}
			
			Promise.all(promises)
			.finally(() => {
				resolve()
			})
		})
		.catch(function(err) {
			log.error(`test_api_youtube_videos: ${err}`)
			reject('tests.api_youtube_videos')
		})
	})
}

export function test_api_youtube_captions() {
	return new Promise(function(resolve,reject) {
		let api_client = new ApiClient()
		
		//let video_ids = ['UelDrZ1aFeY','Xl-BNTeJXjw','MZ3Vh8jZFdE','zVO5xTAbxm8']
		let video_ids = ['jRTQbAtlBSI']
		log.debug(`testing youtube_api captions list with ids = ${video_ids}`)
		
		let promises = []
		for (let video_id of video_ids) {
			let p = api_client.youtube_captions_list(video_id)
			.then(function(data) {
				log.info(`fetched ${data.items.length} captions`)
				
				for (let captions of data.items) {
					log.debug(captions)
				}
			
				return Promise.resolve()
			})
			.catch(function(err) {
				log.error(`test_api_youtube_captions: ${err}`)
				return Promise.reject('tests.api_youtube_captions')
			})
			
			promises.push(p)
		}
		
		Promise.all(promises)
		.then(function() {
			log.info('youtube captions test complete')
			resolve()
		})
		.catch(function(errors) {
			log.error(errors)
			reject('test.api_youtube_captions')
		})
	})
}

export function test_api_youtube_captions_download() {
	return new Promise(function(resolve,reject) {
		let api_client = new ApiClient()
		
		let video_id = 'jRTQbAtlBSI'
		let captions_id = '1dsGRExfCQWEOXQa-8X3a99UPbr63e9wmMOvnytjSSA='
		
		api_client.youtube_captions_download(captions_id, video_id)
		.then(function(path) {
			log.info(`captions downloaded to ${path}`)
			resolve()
		})
		.catch(function(err) {
			log.error(err)
			reject('test.api_youtube_captions_download')
		})
	})
}

export function test_api_youtube_timedtext_download() {
	return new Promise(function(resolve,reject) {
		let api_client = new ApiClient()
		
		let video_ids = [
			// 'kky36rS-4-k','UEzz7Sg_8mc','sN883IakPSw','t2zP7Zxb-iM','FRLmtH8JFEw','AExg1y740Os',
			// 'MIwd505f0U8','HhdNScqy26c','t8FanZG9paU','dE3UzmnpcvQ','dB2OG7UYu1k','ZVVgw8MUjyU',
			// 'vr4klURswVg','Ud8c03yekq0','rWAnqhw4uyU','a276k-8z9HY','3cCFnSeleL0','UsLelSry2ng',
			'iFHpBHGLs7M','FxseCMPrOkU','YGO-C8yRzhA','xW-_gvmDwTc','qljJuhzaabk','br4u3X7TOT4',
			'MBK5Itkom5w'
		]
		let video_id = video_ids[0]
		let downloads = 0
		let p = api_client.youtube_timedtext_download(video_id)
		for (let i=1; i<video_ids.length; i++) {
			p = p
			.then(function(ttxt_path) {
				log.info(`timedtext downloaded to ${ttxt_path}`)
				downloads++
			})
			.catch(function(err) {
				log.error(err)
			})
			.finally(function() {
				return api_client.youtube_timedtext_download(video_ids[i])
			})
		}
		
		p.then(function(ttxt_path) {
			log.info(`timedtext downloaded to ${ttxt_path}`)
			downloads++
		})
		.catch(function(err) {
			log.error(err)
		})
		.finally(function() {
			log.info(`downloaded ${downloads}/${video_ids.length} timedtext files`)
			resolve()
		})
	})
}

export function test_results_show() {
	return new Promise(function(resolve,reject) {
		results_show()
		.then(resolve)
		.catch(function(err) {
			log.error(err)
			reject(err)
		})
	})
}

export function test_results() {
	return new Promise(function(resolve,reject) {
		// show before
		results_show()
		
		// clear
		.then(results_clear_videos)
		
		// add videos
		.then(() => {
			return results_add_videos([
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
			])
		})
		
		// add video
		.then(() => {
			return results_add_videos(
				'<iframe height="200" src="https://www.youtube.com/embed/JMfUdb9QUpM?start=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
			)
		})
		
		// // write
		.then(results_write)
		//
		// // show
		.then(results_show)
		
		// success
		.then(resolve)
		
		// failure
		.catch(function(err) {
			log.error(err)
			reject('tests.results')
		})
	})
}

export function test_promise_assign_outer(do_resolve=true) {
	return new Promise(function(resolve,reject) {
		dummy_call(function() {
			log.debug(`test_promise_assign_outer: old variable = ${JSON.stringify(test_variable)}`)
			if (test_variable == null) {
				test_variable = {
					value: 1
				}
			}
			else if (test_variable.value !== undefined) {
				test_variable.value += 1
			}
			else {
				test_variable.value = 1
			}
			log.debug(`test_promise_assign_outer: new variable = ${JSON.stringify(test_variable)}`)
		
			if (do_resolve) {
				resolve()
			}
			else {
				reject('tests.promise_assign_outer')
			}
		})
	})
}

export function test_captions_reader() {
	return new Promise(function(resolve,reject) {
		let captions_path = TEMP_DIR_PATH + 'timedtext_zVO5xTAbxm8.xml'
		let query = 'possessed by'
		
		log.info('testing CaptionsReader.find_query')
		
		let captions_reader = new CaptionsReader(query)
		
		captions_reader
		.find_query(captions_path)
		.then(function(start_sec) {
			log.info(`found query at start=${start_sec}`)
			resolve()
		})
		.catch(function(err) {
			log.error('CaptionsReader.find_query failed: ' + err)
			reject('test.captions_reader')
		})
	})
}

export function test_eavesdrop_results() {
	return new Promise(function(resolve,reject) {
		let video_id = 'zVO5xTAbxm8'
		let video_path = VIDEO_PATH_PREFIX + video_id + '.' + JSON_FILETYPE
		let ttxt_path = TIMEDTEXT_PATH_PREFIX + video_id + '.' + TIMEDTEXT_FILETYPE
		let query = 'possessed by'
		
		log.info(`finding ${query} in ${video_id}`)
		new CaptionsReader(query)
		.find_query(ttxt_path)
		.then(function(start_sec) {
			if (start_sec == -1) {
				log.error('query not found')
				reject('text.eavesdrop_results.search')
			}
			else {
				log.info('testing compilation of start-second and video embed into results page')
				
				results_clear_videos()
				.then(() => {
					return new Promise(function(resolve,reject) {
						fs.readFile(video_path, 'utf-8', function(err,video) {
							if (err) {
								log.error(err)
								reject('test.eavesdrop_results.fs')
							}
							else {
								compile_video_embed(JSON.parse(video), start_sec)
								.then(function(embed_html) {
									resolve(embed_html)
								})
								.catch(function(err) {
									reject(err)
								})
							}
						})
					})
				})
				.then(function(embed_html) {
					log.info('adding ' + video_id + ' to results page')
					return results_add_videos(embed_html)
				})
				.then(results_write)
				.then(results_show)
				.then(resolve)
				.catch(function(err) {
					log.error(err)
					reject('test.eavesdrop_results.compile')
				})
			}
		})
		.catch(function(err) {
			log.error('failed to search video timedtext for query')
			reject('text.eavesdrop_results.reader')
		})
	})
}
