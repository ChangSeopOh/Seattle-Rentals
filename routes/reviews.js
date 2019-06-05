const express = require('express');
const router = express.Router({ mergeParams : true});
const {asyncErrorHandler, isReviewAuthor} = require('../middleware');
const{
	reviewCreate,
	reviewUpdate,
	reviewDestroy
} = require('../controllers/reviews');

//url was assigned through app.js
/* POST reviews create /posts/:id/reviews */
router.post('/',asyncErrorHandler(reviewCreate));

/* PUT reviews update	 /posts/:id/:reviews_id */
router.put('/:review_id', isReviewAuthor, asyncErrorHandler(reviewUpdate));

/* DELETE reviews destroy  /posts/:id/:reviews_id  */
router.delete('/:review_id',isReviewAuthor, asyncErrorHandler(reviewDestroy));








module.exports = router;
