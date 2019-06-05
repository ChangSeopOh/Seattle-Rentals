const crypto = require('crypto'); //included in nodes. for getting a unique string
const cloudinary = require('cloudinary');

cloudinary.config({
	cloud_name: 'dvhqmkunv',
	api_key: '483655559833663',
	api_secret: process.env.CLOUDINARY_SECRET
});

const cloudinaryStorage = require('multer-storage-cloudinary');
// the storage for multer to use cloudinary

// folder is in folder on the cloudinary website
// why using buffer is to avoid a conflict by same name files. that's why used crypto
// 'hex' encdoes each byue as two hexadecimal characters, so 15 bytes = 32 characters.

const storage = cloudinaryStorage({
  cloudinary,
  folder: 'seattle-rentals',
  allowedFormats: ['jpeg', 'jpg', 'png'],
  filename: function (req, file, cb) {
  	let buf = crypto.randomBytes(16);
  	buf = buf.toString('hex');
  	let uniqFileName = file.originalname.replace(/\.jpeg|\.jpg|\.png/ig, '');
  	uniqFileName += buf;
    cb(undefined, uniqFileName );
  }
});

module.exports = {
	cloudinary,
	storage
};

