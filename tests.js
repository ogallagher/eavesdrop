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

import { TEST_DIR_PATH } from './consts.js'

import * as util from './util.js'
import Logger from './logger.js'

import ApiClient from './api_client.js'

// constants

const NAME = 'eavesdrop:tests'
export const log = new Logger(NAME)

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

export function test_api_youtube_search() {
	return new Promise(function(resolve, reject) {
		let api_client = new ApiClient('api_key')
		
		api_client.youtube_search('something')
		.then(resolve)
		.catch(function(err) {
			log.error('api youtube search failed')
			reject(err)
		})
	})
}
