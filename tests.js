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
	PROGRAM_NAME
} from './consts.js'

import {
	dummy_call
} from './util.js'

import Logger from './logger.js'

import {
	translate,
	translate_n
} from './io.js'

import ApiClient from './api_client.js'

import {
	clear_videos as results_clear_videos,
	add_videos as results_add_videos,
	write as results_write,
	show as results_show,
} from './results.js'

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
						reject('filesystem.rmdir')
					}
					else {
						log.info('removed test directory from ' + TEST_DIR_PATH)
						resolve()
					}
				})
			}
			else {
				reject('filesystem.mkdir')
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
				['--logging', log.level, '--do', 'test_parallel']
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
				reject('fork')
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
				reject('request.get')
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
			reject(err)
		}
	})
}

export function test_api_youtube_search() {
	return new Promise(function(resolve, reject) {
		let api_client = new ApiClient('api_key')
		
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
				return Promise.reject('test.api_youtube_search')
			})
		}
		
		p.then(function(res) {
			api_client.search_results_max = restore_search_results_max
			resolve()
		})
		.catch(function(err) {
			reject(err)
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
			reject(err)
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
				reject('test.promise_assign_outer')
			}
		})
	})
}
