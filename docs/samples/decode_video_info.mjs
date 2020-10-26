import fs from 'fs'
import request from 'request'

export let YTB_VIDEO_INFO_URL = 'https://www.youtube.com/get_video_info'

function download_video_info(video_id) {
	return new Promise(function(resolve,reject) {
		request
		.get(YTB_VIDEO_INFO_URL + '?video_id=' + video_id)
		.pipe(fs.createWriteStream('encoded_video_info.txt'))
		.on('finish', function() {
			resolve('encoded_video_info.txt')
		})
		.on('error', function(err) {
			reject(err)
		})
	})
}

function get_captions_info(encoded_video_info_path) {
	return new Promise(function(resolve,reject) {
		fs.readFile(encoded_video_info_path, function(err,data) {
			if (err) {
				reject(err)
			}
			else {
				let decoded = decodeURIComponent(data)
				let a = decoded.indexOf('player_response=') + 'player_response='.length
				let b = decoded.indexOf('}&') + 1
				
				decoded = decoded.substring(a,b)
				
				fs.writeFile('decoded_video_info.txt', decoded, function(err) {
					if (err) {
						reject(err)
					}
					else {
						console.log('saved decoded video to file')
					}
				})
				
				let captions_info = JSON.parse(decoded)
					.captions
					.playerCaptionsTracklistRenderer
				
				fs.writeFile('captions_info.json', JSON.stringify(captions_info,null,'\t'), function(err) {
					if (err) {
						reject(err)
					}
					else {
						resolve('captions_info.json')
					}
				})
			}
		})
	})
}

function download_captions(captions_info_path, language='en') {
	return new Promise(function(resolve,reject) {
		fs.readFile(captions_info_path, function(err,data) {
			if (err) {
				reject(err)
			}
			else {
				let captions_info = JSON.parse(data)
				let caption_track_info = captions_info.captionTracks[0]
				let captions_url = caption_track_info.baseUrl
				
				if (caption_track_info.languageCode.substring(0,2) != language) {
					if (caption_track_info.isTranslatable) {
						let og_lang = caption_track_info.languageCode
						captions_url = captions_url.replace(`lang=${og_lang}`,`lang=${language}`)
					}
					else  {
						reject(`translation to ${language} not available`)
					}
				}
				
				let captions_path = `timedtext-${language}.xml`
				
				request
				.get(captions_url)
				.pipe(fs.createWriteStream(captions_path))
				.on('finish', function() {
					resolve(captions_path)
				})
				.on('error', function(err) {
					reject(err)
				})
			}
		})
	})
}

download_video_info('zVO5xTAbxm8')
.then(function(encoded_video_info_path) {
	console.log('write encoded video info to ' + encoded_video_info_path)
	
	get_captions_info(encoded_video_info_path)
	.then(function(captions_info_path) {
		console.log(`wrote captions url to ${captions_info_path}`)
		
		download_captions(captions_info_path, 'en')
		.then(function(captions_path) {
			console.log(`downloaded timedtext captions to ${captions_path}`)
		})
		.catch(function(err) {
			console.log(err)
		})
	})
	.catch(function(err) {
		console.log(err)
	})
})
.catch(function(err) {
	console.log(err)
})
