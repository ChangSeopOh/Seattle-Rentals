const Review = require('../models/review');
const User = require('../models/user');
const Post = require('../models/post');
const { cloudinary } = require('../cloudinary');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocodingClient = mbxGeocoding({accessToken: mapBoxToken});

function escapeRegExp(string){
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); //$& means the whole matched string
	//prevent url injection. ?100 =>>> \?100
};


const middleware = {
	asyncErrorHandler: (fn)=>
		(req, res, next)=> {
			Promise.resolve(fn(req,res,next))
				   .catch(next);
		},
	isReviewAuthor: async (req,res,next) =>{
		let review = await Review.findById(req.params.review_id);
		if(review.author.equals(req.user._id)){
			return next();
		}		
		req.session.error = "Bye Bye";
		return res.redirect('/');
	},
	isLoggedIn: (req,res,next)=>{
		if(req.isAuthenticated())return next();

		req.session.error = 'You need to be logged in to do that!';
		req.session.redirectTo = req.originalUrl;
		res.redirect('/login'); //send to previous URL after logged in
	},
	isAuthor: async(req,res,next)=>{
		const post = await Post.findById(req.params.id);
		if(post.author.equals(req.user._id)){
			res.locals.post = post;
			return next();
		}	
		
		req.session.error = "Access denied!";
		res.redirect('back');
	},
	isValidPassword : async(req,res,next )=>{
						//high order funtion. invoked authenticate function and then sending arguments
		const {user} = await User.authenticate()(req.user.username, req.body.currentPassword);
		if(user){
			// add user to res.locals
			res.locals.user = user;
			next();
		}else{
			middleware.deleteProfileImage(req);
			req.session.error = 'Incorrect current password!';
			return res.redirect('/profile');
		}
	},
	changePassword : async(req,res,next)=>{
		const {
			newPassword,
			passwordConfirmation
		}=req.body;
		//if there is no password, then just skipped
		
		// if(newPassword&&!passwordConfirmation){
		// 	req.session.error="Missing password confirmation!";
		//  middleware.deleteProfileImage(req);
		// 	return res. redirect('/profile');
		// }else 
		if(newPassword && passwordConfirmation){
			const {user} = res.locals;
			if(newPassword ===passwordConfirmation){
				await user.setPassword(newPassword);
				next();
			} else{	
				middleware.deleteProfileImage(req);
				req.session.error = 'New passwords must match!';
				return res.redirect('/profile');
			}
		}else{
			next();
		}
	},
	deleteProfileImage : async req=>{
		if(req.file) await cloudinary.v2.uploader.destroy(user.image.public_id);
	},
	searchAndFilterPosts : async(req,res,next) =>{
		// pull keys from req.query (if there are any) and assign them 
		// to queryKeys variable as an array of string values
		const queryKeys = Object.keys(req.query);
	 
		if (queryKeys.length) {
			// initialize an empty array to store our db queries (objects) in
			const dbQueries = [];
			// destructure all potential properties from req.query
			let { search, price, avgRating, location, distance  } = req.query;
			// check if search exists, if it does then we know that the user
			// submitted the search/filter form with a search query
			if (search) {
				// convert search to a regular expression and 
				// escape any special characters
				search = new RegExp(escapeRegExp(search), 'gi'); 
				// g: global match; find all matched rather than stopping after the first match
				// i: ingonar case; A === a, Z === z
				 
				dbQueries.push({ $or: [
					{ title: search },
					{ description: search },
					{ location: search }
				]});
			}
			// check if location exists, if it does then we know that the user
			// submitted the search/filter form with a location query
			if (location) {
				// geocode the location to extract geo-coordinates (lat, lng)
				const response = await geocodingClient
				  .forwardGeocode({
				    query: location,
				    limit: 1
				  })
				  .send();
				// destructure coordinates [ <longitude> , <latitude> ]
				const { coordinates } = response.body.features[0].geometry;
				// get the max distance or set it to 25 mi
				let maxDistance = distance || 25;
				// we need to convert the distance to meters, one mile is approximately 1609.34 meters
				maxDistance *= 1609.34;
				// create a db query object for proximity searching via location (geometry)
				// and push it into the dbQueries array
				dbQueries.push({
				  geometry: {
				    $near: {
				      $geometry: {
				        type: 'Point',
				        coordinates
				      },
				      $maxDistance: maxDistance
				    }
				  }
				});
			}
			// check if price exists, if it does then we know that the user
			// submitted the search/filter form with a price query (min, max, or both)
			if (price) {
			 
				if (price.min) dbQueries.push({ price: { $gte: price.min } });
				if (price.max) dbQueries.push({ price: { $lte: price.max } });
			}
			// check if avgRating exists, if it does then we know that the user
			// submitted the search/filter form with a avgRating query (0 - 5 stars)
			if (avgRating) {
				// create a db query object that finds any post documents where the avgRating
				// value is included in the avgRating array (e.g., [0, 1, 2, 3, 4, 5])
				dbQueries.push({ avgRating: { $in: avgRating } });
			}

			// pass database query to next middleware in route's middleware chain
			// which is the postIndex method from /controllers/postsController.js
			res.locals.dbQuery = dbQueries.length ? { $and: dbQueries } : {};
		} 
		res.locals.query = req.query;
 
		queryKeys.splice(queryKeys.indexOf('page'), 1);
		 
		const delimiter = queryKeys.length ? '&' : '?';
	 
		res.locals.paginateUrl = req.originalUrl.replace(/(\?|\&)page=\d+/g, '') + `${delimiter}page=`;
		// move to the next middleware (postIndex method)
		next();
	}
}; 
module.exports = middleware;
 