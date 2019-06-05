const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Review = require('./review');
const mongoosePaginate = require('mongoose-paginate');

const PostSchema = new Schema({
	title : String,
	price : String,
	description : String,
	images : [{
				url : String,
			   	public_id : String
			  }],
	location : String,
	geometry : {
		type: {
			type: String,
			enum: ['Point'],
			required : true
		},
		coordinates:{
			type: [Number],
			required : true
		}
	}, 
	properties:{
		description: String
	},
	author : {
		type: Schema.Types.ObjectId,
		ref : 'User'
	},
	reviews : [{
		type: Schema.Types.ObjectId,
		ref : 'Review'
	}],
	avgRating : {type: Number,
				 default :0}
});

//controllers/posts -> when postDestory excuted, then excuted bottom
//when delete post, delete all reviews belong to the post

PostSchema.pre('remove', async function(){
	await Review.remove({
		_id : {
			$in: this.reviews
		}
	});// check reviews'id in array
});

PostSchema.methods.calculateAvgRating = function(){
	let ratingsTotal = 0;
	if(this.reviews.length){
		this.reviews.forEach(review =>{
			ratingsTotal += review.rating;
		});
		this.avgRating = Math.round((ratingsTotal/this.reviews.length)*10)/10;
		
	}else{
		this.avgRating = ratingsTotal;
	}
	const floorRating = Math.floor(this.avgRating);
	this.save();
	return floorRating; //Decimal Point rounded down to make integer number. 3.2, 3.9 -> 3
}

PostSchema.plugin(mongoosePaginate);

//A 2dsphere index supports queries that calculate geometries on an earth-like sphere.
//It helps to find places near the location that you searched
PostSchema.index({geometry:'2dsphere'});


module.exports = mongoose.model('Post', PostSchema);



/*
Post
- title -String
- price -String
- description -String
- images -array of Strings
- location -String
lat and lng to coordinates 
- lat -number
- lng -number
- author -object id
- reviews -array of objects
*/