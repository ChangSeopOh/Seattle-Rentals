const User = require('../models/user');
const Post = require('../models/post');
const passport = require('passport');
const mapBoxToken = process.env.MAPBOX_TOKEN;
//to using util must be at least node v8.0.0.
const util = require('util');
const {cloudinary} = require('../cloudinary');
const { deleteProfileImage} = require('../middleware');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// need to changed to mailgun. 

module.exports = {
	// GET /
	async landingPage(req,res,next){
		const posts = await Post.find({});
		res.render('index',{posts, mapBoxToken, title: 'Seattle Rentals - Home'});
	},
	//GET /register
	getRegister(req, res, next){
		res.render('register',{title:'Register', username: '', email: '' });
	},

	// POST /register
	async postRegister(req, res, next) {
		try {
			if(req.file){
				const {secure_url, public_id}=req.file;
				req.body.image ={ secure_url, public_id};

			}
			const user = await User.register(new User(req.body), req.body.password);
			req.login(user, function(err) {
				if (err) return next(err);
				req.session.success = `Welcome to Seattle Rentals, ${user.username}!`;
				res.redirect('/');
			});
		} catch(err) {
			deleteProfileImage(req);
			const { username, email } = req.body;
			let error = err.message;
			if (error.includes('duplicate') && error.includes('index: email_1 dup key')) {
				error = 'A user with the given email is already registered';
			}
			res.render('register', { title: 'Register', username, email, error });
		}
	},


	//GET /login
	getLogin(req, res, next){
		if(req.isAuthenticated()) return res.redirect('/');
		
		if(req.query.returnTo) req.session.redirectTo = req.headers.referer;
		
		res.render('login',{title:'Login'});
	},

	//Post /login
	async postLogin(req, res, next){
		const { username, password } = req.body;
								//bottom is high-order function
								//invoked authenticate function, and immediately invoked again with the second set of paramiters
								//and then the result into the object
		const { user, error } = await User.authenticate()(username, password);
		if(!user && error) return next(err);

		req.login(user, function(err){
			if(err) return next(err);

			req.session.success =`Welcome back, ${username}!`;
			//redirectUrl is from middleware that previous url to send that url after logged in
			const redirectUrl = req.session.redirectTo || '/';
			delete req.session.redirectTo;
			res.redirect(redirectUrl);
		});
	}, //End of postLogin Method

	//GET /logout
	getLogout(req, res, next){
	  req.logout();
	  res.redirect('/');
	},
	async getProfile(req,res,next){
		const posts = await Post.find().where('author').equals(req.user._id).limit(10).exec();
		res.render('profile',{posts});
	},
	async updateProfile(req,res,next){
		const {
			username,
			email,
		} = req.body;
		const {user} = res.locals; //it's from middleware
		if(username) user.username = username;
		if(email) user.email = email;
		if(req.file){
			if(user.image.public_id) await cloudinary.v2.uploader.destroy(user.image.public_id);
			const { secure_url, public_id} = req.file;
			user.image = {secure_url, public_id};
		}

		await user.save();
					//promisify function that converts a regular function into an async function that returns a promise.
					//req.login needs to have access to the request object, so use bind method
		//to login again for new information.
		const login = util.promisify(req.login.bind(req));
		await login(user);
		req.session.success= 'Profile successfully updated!';
		res.redirect('/profile');
		//need to set duplicated email.
	},
	getForgotPw(req, res, next){
		res.render('users/forgot');
	},
	async putForgotPw(req,res,next){
		const token = await crypto.randomBytes(20).toString('hex');
		const {email} = req.body;
		const user = await User.findOne({email});
		if(!user){
			req.session.error = 'No account with that email.';
			return res.redirect('/forgot-password');
		}
		user.resetPasswordToken = token;
		user.resetPasswordExpires = Date.now() +900000; //15mins from now token would be expired; it's milliseconds. 60000/1min
		await user.save();

		const msg ={
			to : email,
			from : 'Seattle Rentals Admin<jaden.oh@yahoo.com>',
			subject : 'Password reset instructions for Seattle Rentals',
			text: 
					`Hi ${user.username},

					You have requested a new password for your Seattle Rentals account.

					Please click this link to set your new password:
					http://${req.headers.host}/reset/${token}
					For security reasons, this link will expire in 15 minutes. 
					To request another password reset, visit: http://${req.headers.host}/forgot-password

					Best,
					Your Seattle Rentals Team`.replace(/					/g, '')
			//,html:''
  
		}; 
		
		await sgMail.send(msg);

		req.session.success = `An email has been sent to ${email} with further instructions.`;
		res.redirect('/forgot-password');
	},
	async getReset(req,res,next){
		const {token} = req.params;
		const user = await User.findOne({
			resetPasswordToken : token,
			resetPasswordExpires : {$gt: Date.now()}
		});
		//$gt is grater than in mongo cmd
		//if passwordExpires is expired, then user is empty
		if(!user){
			res.session.error = 'Password reset token is invalid or has expired.';
			return res.redirect('/forgot-password');
		}

		res.render('users/reset', { token });

	},
	async putReset(req,res,next){
		const {token} = req.params;
		const user = await User.findOne({
			resetPasswordToken : token,
			resetPasswordExpires : {$gt: Date.now()}
		});
		
		if(!user){
			res.session.error = 'Password reset token is invalid or has expired.';
			return res.redirect('/forgot-password');
		}

		if(req.body.password ===req.body.confirm){
			await user.setPassword(req.body.password);
			user.resetPasswordToekn = null;
			user.resetPasswordExpires = null;
			await user.save();
			const login = util.promisify(req.login.bind(req));
			await login(user);
		}else{
			req.session.error = 'Passwords do not match.';
			return res.redirect(`/reset/${token}`);
		}

		const msg ={
			to : user.email,
			from : 'Seattle Rentals Admin<jaden.oh@yahoo.com>',
			subject : 'Seattle Rentals - Password has been changed',
			text: 
					`Hi ${user.username},

					This email is to confirm that the password for your account has just been changed.
					If you did not make this change, please hit reply and notify us at once.

					Best,
					Your Seattle Rentals Team`.replace(/					/g, '')
  
		};
		await sgMail.send(msg);

	  req.session.success = 'Password successfully updated!';
	  res.redirect('/');

	}
};
