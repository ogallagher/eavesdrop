/*

Owen Gallagher
2020-10-24

*/

// external imports

import {
	Transform
} from 'stream'

import he from 'he'

import fs from 'fs'

import xml_parser from 'fast-xml-parser'

// local imports

import {
	PROGRAM_NAME,
	TTXT_REGEX_ESCAPE,
	TIMEDTEXT_FILETYPE,
	CAPTION_SEARCH_FOUND
} from './consts.js'

import Logger from './logger.js'

// constants

const NAME = PROGRAM_NAME + ':reader'
export const log = new Logger(NAME)

// methods

// classes

export function CaptionsReader(query) {
	this.query = query.toLowerCase()
	this.start_sec = -1
}

CaptionsReader.prototype.filter_text = function(xml_encoded_text) {
	let text = he.decode(xml_encoded_text)
	
	if (text.indexOf(this.query) != -1) {
		return CAPTION_SEARCH_FOUND
	}
	else {
		return text
	}
}

CaptionsReader.prototype.find_query = function(ttxt_path) {
	this.start_sec = -1
	let self = this
	
	return new Promise(function(resolve,reject) {
		if (ttxt_path != undefined) {
			log.debug(`searching for ${self.query} in ${ttxt_path}`)
			fs.readFile(ttxt_path, 'utf-8', function(err, data) {
				if (err) {
					log.error(err)
					reject('CaptionsReader.find_query.fs')
				}
				else {
					if (ttxt_path.endsWith(TIMEDTEXT_FILETYPE)) {
						// convert xml to JSON
						try {
							let json = xml_parser.parse(data, {
								tagValueProcessor: function(tag) {
									return self.filter_text(tag)
								},
								ignoreAttributes: false,
								attributeNamePrefix: '@_',
								textNodeName: '#text'
							}).transcript
							
							let found = false
							let text = null
							for (let i=0; i<json.text.length && !found; i++) {
								text = json.text[i]
								if (text['#text'] == CAPTION_SEARCH_FOUND) {
									self.start_sec = parseFloat(text['@_start'])
									found = true
								}
							}
							
							if (found) {
								resolve(self.start_sec)
							}
							else {
								resolve(-1)
							}
						}
						catch (e) {
							log.error(e)
							reject('CaptionsReader.find_query.parse')
						}
					}
					else {
						log.error(`${ttxt_path} is unsupported filetype for \
							CaptionsReader.find_query`)
						reject('CaptionsReader.find_query.filetype')
					}
				}
			})
		}
		else {
			reject('CaptionsReader.find_query.none')
		}
	})
}

export class TimedTextCleaner extends Transform {
	constructor() {
		super({
			readableObjectMode: true,
			writableObjectMode: true
		})
		
		this.partial = ''
	}
	
	_transform(chunk, encoding, next) {
		let filtered = chunk
		// convert buffer to String
		.toString(encoding)
		// convert xml escape sequences (ttxt is double-escaped, so ' => &39; => &amp;39;)
		.replace(TTXT_REGEX_ESCAPE,he.decode)
		// to lower case
		.toLowerCase()
		
		return next(null,filtered)
	}
}
