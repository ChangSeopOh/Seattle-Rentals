const faker = require('faker'); //making dummy data
const Post = require('./models/post');
const cities = require('./cities');
const {cloudinary} =require('./cloudinary'); 

async function seedPosts() {
//delete all of images in surf-shop folder
await cloudinary.api.delete_resources_by_prefix('seattle-rentals/', function(result){});

	await Post.deleteMany({}); //delete all posts before putting dump data
	for(const i of new Array(600)) {
		const random5 = Math.floor(Math.random() * 6);
		const random1000 = Math.floor(Math.random() * 1000);
		const title = faker.lorem.word();
		const description = faker.lorem.text();
		const postData = {
			title,
			description,
			location: `${cities[random1000].city}, ${cities[random1000].state}`,
			geometry: {
				type: 'Point',
				coordinates: [cities[random1000].longitude, cities[random1000].latitude],
			},
			price: Math.floor(random1000 /10)*10,
			avgRating : random5,
			author: '5cf34a71047b2203e1c45f23'
		}
		let post = new Post(postData);
		post.properties.description = `<strong><a href="/posts/${post._id}">${title}</a></strong><p>${post.location}</p><p>${description.substring(0, 20)}...</p>`;
		await post.save();
	}
	console.log('600 new posts created');
}

module.exports = seedPosts;