// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const User = require("../models/User");
const ensureLogin = require("connect-ensure-login");


const authRoutes = express.Router();
const bcryptSalt = 10;

authRoutes.get("/signup", (req, res, next) => {
  res.render("auth/signup");
});

authRoutes.post("/signup", (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  if (email === "" || password === "") {
    res.render("auth/signup", { message: "Indicate email and password" });
    return;
  }

  User.findOne({ email })
  .then(user => {
    if (user !== null) {
      res.render("auth/signup", { message: "The email already exists" });
      return;
    }

    const salt = bcrypt.genSaltSync(bcryptSalt);
    const hashPass = bcrypt.hashSync(password, salt);

    const newUser = new User({
      email,
      password: hashPass
    });

    newUser.save((err) => {
      if (err) {
        res.render("auth/signup", { message: "Something went wrong" });
      } else {
        res.redirect("/");
      }
    });
  })
  .catch(error => {
    next(error)
  })
});

authRoutes.get("/login", (req, res, next) => {
  res.render("auth/login", { 
    message: req.flash("error") 
  });
});

authRoutes.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: true,
  passReqToCallback: true
}));

// ensureLogin.ensureLoggedIn() check if the user is connected
// -> if connected, go to the next middleware
// -> else, redirect to '/login' (default)
authRoutes.get("/private-page", ensureLogin.ensureLoggedIn(), (req, res) => {
  // Thanks to passport, when we are connected, req.user is defined 
  // and req.user is equal to the connected user
  res.render("private", { user: req.user });
});

authRoutes.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/login");
});

// NEW
authRoutes.get("/auth/slack", passport.authenticate("slack"));
authRoutes.get("/auth/slack/callback", passport.authenticate("slack", {
  successRedirect: "/private-page",
  failureRedirect: "/"
}));

module.exports = authRoutes;
