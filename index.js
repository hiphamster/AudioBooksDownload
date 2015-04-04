/**
 * Created by a.murin on 03.04.15.
 */

var jsdom = require('jsdom');
var request = require('request');
var Sync = require('sync');
var fs = require('fs');
var ffmetadata = require("ffmetadata");

require('./fmt.js');

var args = process.argv.slice(process.argv[0].match(/node/i) ? 1 : 0);
var url = args[args.length - 1];

if (!url.match(/^http/i)) {

	console.log('Usage: %@ url'.fmt(args[0]));
	process.exit(-1);
}


var saveUrlToFile = function (path, url, cb) {

	var fileName = path + '/' + url.replace(/^.+\/([^/]+)$/, '$1');

	console.log('Download "%@" to "%@"'.fmt(url, fileName));

	request({url: url, encoding: null}, function (err, res, body) {

		if (err)
			return cb(err);

		if (res.statusCode !== 200)
			console.log('Response code: %@'.fmt(res.statusCode));

		//console.log(res);
		//console.log(res.body.length);
		delete res.body;
		fs.writeFile(fileName, body, function (err) {

			if (err)
				return cb(err);

			console.log('Done: %@ bytes'.fmt(body.length));

			cb(null, fileName);
		});
		//{encoding: null}, cb);
		//console.log(body.length);
	});
};

var processFunction = function (errors, window) {

	Sync(
		function () {

			var $ = window.$;
			var title = $('[property="og:title"]').attr('content');
			var parts = title.split(/\s+\-\s+/);
			var artist = parts[0];
			var book = parts[1];

			var content = $('#content');
			var img = content.find('img[alt=image]:first').attr('src');
			var data = content.find('script:first').text();

			console.log('Title:', title);
			console.log('Image:', img);

			if (!fs.existsSync(title))
				fs.mkdirSync(title);

			var imgFileName = saveUrlToFile.sync(null, title, img);

			data = data.match(/{[^{]+title:"[^"]+"[^}]+mp3:"[^"]+"[^}]+}/gmi);
			var tracks = data.length;

			data.forEach(function (item) {

				item = item.replace(/(title|mp3):/g, '"$1":').replace(/(\n|\r)/g, '').replace(/,\s+}/g, '}');
				item = JSON.parse(item);

				var fileName = saveUrlToFile.sync(null, title, item.mp3);

				//var meta = ffmetadata.read.sync(ffmetadata, fileName);
				//console.log(meta);
				var num = fileName.match(/(\d+)[^/]+$/);
				num = num ? parseInt(num[1]) : 0;

				ffmetadata.write.sync(
					ffmetadata,
					fileName,
					{
						artist: artist,
						album: book,
						title: fileName.split(/\//)[1].replace(/^\d+_/, '').replace(/\.mp3$/i, ''),
						track: '%@/%@'.fmt(num, tracks)
					},
					{
						attachments: [imgFileName]
					}
				);
			});


		},
		function (err) {

			if (err)
				throw err && err.stack ? err.stack : err;
		}
	);
};

console.log('Downloading "%@"...'.fmt(url));

jsdom.env(
	url,
	['http://code.jquery.com/jquery.js'],
	processFunction
);

