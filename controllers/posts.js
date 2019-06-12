const Post = require('../models/post');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocodingClient = mbxGeocoding({accessToken: mapBoxToken});
const {cloudinary} =require('../cloudinary'); 


module.exports = {
	// Posts Index
	async postIndex(req, res, next) {
		const{dbQuery} = res.locals;
		delete res.locals.dbQuery;// get query and then delete, becuase it includes a lot
							//mongoose'paginate, first brace{} is query, second is option that you can find out by Documentations in mongoose website.
		let posts = await Post.paginate(dbQuery,{
			page: req.query.page || 1,
			limit : 10,
			sort: '-_id'
		});// changed to paginate from find by mongoose-paginate
		// 10 posts per page
		// sort -1 dscending, 1 asceding // example = sort: {'_id' : -1}

		posts.page = Number(posts.page);
		if (!posts.docs.length && res.locals.query){
			res.locals.error = 'No results match that query.';

		}
		res.render('posts/index', { 
			posts, 
			mapBoxToken, 
			title : 'Posts Index' });
	},
	// Posts New
	postNew(req, res, next) {
		res.render('posts/new');
	},
	// Posts Create
	async postCreate(req, res, next) {
		req.body.post.images = [];
		// for(const file of req.files) {
		// 	let image = await cloudinary.v2.uploader.upload(file.path);
		// 	req.body.post.images.push({
		// 		url: image.secure_url,
		// 		public_id: image.public_id
		// 	});
		// }
		//directly upload to cloudinary
		for(const file of req.files) {
			req.body.post.images.push({
				url: file.secure_url,
				public_id: file.public_id
			});
		}	

		let response = await geocodingClient.forwardGeocode({
		  query: req.body.post.location,
		  limit: 1
		}).send();
		req.body.post.geometry = response.body.features[0].geometry;
		req.body.post.author = req.user._id;//currentUser is author
		let post = new Post(req.body.post);
		
		//bottome description is markup-popup description
		post.properties.description = `<strong><a href="/posts/${post._id}">${post.title}</a></strong><p>${post.location}</p><p>${post.description.substring(0, 20)}...</p>`;
		await post.save();

		req.session.success= 'Post created Successfully!';
		
		res.redirect(`/posts/${post.id}`);
	},
	// Posts Show
	async postShow(req, res, next) {
		let post = await Post.findById(req.params.id).populate({
			path : 'reviews',
			options : {sort: {'_id' : -1} },
			populate : {
				path : 'author',
				model : 'User'
			}
		}); //-1 is descending order

		const floorRating = post.calculateAvgRating(); //avg rating calculator only interger number. 
		//const floorRating = post.avgRating; 
		
		res.render('posts/show', { post,mapBoxToken, floorRating });
	},
	// Posts Edit
	postEdit(req, res, next) {
		res.render('posts/edit');
	},
	// Posts Update
	async postUpdate(req, res, next) {
		// destructure post from res.locals
		const {post} = res.locals; //res.locals by middleware
		// check if there's any images for deletion
		if(req.body.deleteImages && req.body.deleteImages.length) {	
		//eval(require('locus'));		
			// assign deleteImages from req.body to its own variable
			let deleteImages = req.body.deleteImages;
			// loop over deleteImages
			for(const public_id of deleteImages) {
				// delete images from cloudinary
				await cloudinary.v2.uploader.destroy(public_id);
				// delete image from post.images
				for(const image of post.images) {
					if(image.public_id === public_id) {
						let index = post.images.indexOf(image);
						post.images.splice(index, 1);
					}
				}
			}
		}
		// check if there are any new images for upload
		if(req.files) {
			// upload images
			// for(const file of req.files) {
			// 	let image = await cloudinary.v2.uploader.upload(file.path);
			// 	// add images to post.images array
			// 	post.images.push({
			// 		url: image.secure_url,
			// 		public_id: image.public_id
			// 	});
			// }
			for(const file of req.files) {
				post.images.push({
					url: file.secure_url,
					public_id: file.public_id
				});
			}	
		}
		//check database's location and new location
		if(req.body.post.location!== post.location){
			let response = await geocodingClient.forwardGeocode({
			  query: req.body.post.location,
			  limit: 1
			}).send();
			post.geometry = response.body.features[0].geometry;
			post.location = req.body.post.location;
		};


		// update the post with any new properties
		post.title = req.body.post.title;
		//post's description
		post.description = req.body.post.description;
		post.price = req.body.post.price;
		//mark-up's description     //why using backtick"`" is because it's a template literal
		post.properties.description = `<strong><a href="/posts/${post._id}">${post.title}</a></strong><p>${post.location}</p><p>${post.description.substring(0, 20)}...</p>`;

		// save the updated post into the db
		await post.save();
		// redirect to show page
		res.redirect(`/posts/${post.id}`);
	},
	// Posts Destroy
	async postDestroy(req, res, next) {
		const {post} = res.locals;
		for(const image of post.images){
			await cloudinary.v2.uploader.destroy(image.public_id);
		}
		await post.deleteOne();
		req.session.success = "Post deleted successfully!";
		res.redirect('/posts');
	}
}
