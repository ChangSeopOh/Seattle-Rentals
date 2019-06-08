require('dotenv').config();
// process.env

const createError = require('http-errors');
const express = require('express');
// to use boilerplate for ejs files
const engine = require('ejs-mate');
const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
//express in middleware with 4.16 version inculeded bodyParser

const passport = require('passport');
const logger = require('morgan');
const User = require('./models/user');
const session = require('express-session');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
//const seedPosts = require('./seeds');
//seedPosts();  // Test data generation

// require routes
const index = require('./routes/index'); 
const posts = require('./routes/posts');
const reviews = require('./routes/reviews');

const app = express();

// connect to the database
mongoose.connect(process.env.DATABASEURL, {
  useNewUrlParser:true, 
  useFindAndModify: false 
}).then(()=>{
  console.log('Conntected to DB!');
}).catch(err =>{
  console.log('DB Error : ', err.message);
});



const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', ()=>{
  console.log('We\'re Connected!');
});
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);


// use ejs-locals for all ejs templates:
app.engine('ejs',engine);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Setup public assets directory like images dir
app.use(express.static('public'));

app.use(favicon(path.join(__dirname, 'public','favicon.ico')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));// if you set false, then parameter would be only String type when from html to Database
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method')); //it make change method from POST to Others


//it should be before configuring passport
app.use(session({
  secret: 'apartments!',
  resave: false,
  saveUninitialized: true
}));

//Configure Passport and Sessions 
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//set local variables middleware
// title middleware/ it should be before Routes 
app.use(function(req, res, next){
  //automatically loged in
  // req.user = {
  //   // "_id" : "5cf176233a732e06f13662f3",
  //   // "username" : "ian"  
  //   "_id" : "5cf1ce533d6b7213184f8c9c",
  //   "username" : "ian3"
  // }
  
  res.locals.currentUser = req.user;

  //set default page title
  res.locals.title = 'Seattle Rentals'; //default title 
  
  //set success flash message
  res.locals.success= req.session.success || '';
  delete req.session.success;

  //set error flash message
  res.locals.error= req.session.error || '';
  delete req.session.error;

  //continue on to next function in middleware chain
  next();
});

//Mount routes
app.use('/', index);
app.use('/posts', posts);
app.use('/posts/:id/reviews', reviews);
//app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // // set locals, only providing error in development
  // res.locals.message = err.message;
  // res.locals.error = req.app.get('env') === 'development' ? err : {};
  // // render the error page
  // res.status(err.status || 500);
  // res.render('error');

  // set error flash message and back to previous page
  console.log(err);
  req.session.error = err.message;
  res.redirect('back');


});


module.exports = app;
