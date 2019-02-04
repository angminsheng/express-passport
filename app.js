require('dotenv').config();

const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');
const express      = require('express');
const favicon      = require('serve-favicon');
const hbs          = require('hbs');
const mongoose     = require('mongoose');
const logger       = require('morgan');
const path         = require('path');
const session = require("express-session");
const bcrypt = require("bcrypt");
const passport = require("passport");
const User = require("./models/User");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("connect-flash");
const SlackStrategy = require('passport-slack').Strategy;





mongoose
  .connect('mongodb://localhost/express-passport', {useNewUrlParser: true})
  .then(x => {
    console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`)
  })
  .catch(err => {
    console.error('Error connecting to mongo', err)
  });

const app_name = require('./package.json').name;
const debug = require('debug')(`${app_name}:${path.basename(__filename).split('.')[0]}`);

const app = express();

let counter = 0

// Middleware Setup
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Express View engine setup

app.use(require('node-sass-middleware')({
  src:  path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  sourceMap: true
}));
      

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));

// Passport configuration
passport.serializeUser((user, cb) => {
  console.log('serializeUser', user);
  cb(null, user._id);
});
passport.deserializeUser((id, cb) => {
  console.log('deserializeUser', id);
  User.findById(id, (err, user) => {
    if (err) { return cb(err); }
    cb(null, user);
  });
});
// This is used for the login
app.use(flash());
passport.use(new LocalStrategy(
  { 
    passReqToCallback: true, 
    usernameField: 'email', // default: 'username', 
    // passwordField: 'password', // default: 'password'
  },
  (req, email, password, done) => { // username->email
  console.log('LocalStrategy', email, password);
  User.findOne({ email:email }, (err, user) => {
    if (err) {
      return done(err);
    }
    if (!user) {
      return done(null, false, { message: "Incorrect email" });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return done(null, false, { message: "Incorrect password" });
    }
    return done(null, user);
  });
}));
// NEW
passport.use(new SlackStrategy({
  clientID: "2432150752.540770117489",
  clientSecret: "8b0d437a4cf194f6fcf167d899361d89",
  scope: ['emoji:read','team:read']
}, (accessToken, refreshToken, profile, done) => {
	console.log('TCL: profile', profile)
  User.findOne({ slackID: profile.id })
  .then(user => {
    if (user) {
      return done(null, user);
    }
    User.create({
      slackID: profile.id,
      email: profile.user.email,
      name: profile.user.name,
      pictureUrl: profile.user.image_1024,
    })
    .then(user => {
      done(null, user);
    })
  })
  .catch(done)
}))



// default value for title local
app.locals.title = 'Express - Generated with IronGenerator';

// Should before the routes
app.use(session({
  secret: "our-passport-local-strategy-app",
  resave: true,
  saveUninitialized: true,
  // store: new MongoStore({ mongooseConnection: db })
}));
app.use(passport.initialize());
app.use(passport.session());


app.use((req,res,next)=> {
  console.log('Middleware 1')
  counter++
	console.log('TCL: counter', counter)
  next()
})
// app.use((req,res,next)=> {
//   console.log('Middleware 2')
//   next()
// })

app.use('/', require('./routes/index'))
app.use('/', require('./routes/auth'))


module.exports = app;
