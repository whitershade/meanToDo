// server.js

// set up ======================================================================
// get all the tools we need
var express  = require('express');
var app      = express();
var port     = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');

var configDB = require('./config/database.js');

var Todo = require('./config/model');
// configuration ===============================================================
mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(session({ secret: 'ilovescotchscotchyscotchscotch' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session
app.use(express.static('./app'));

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);

// api ---------------------------------------------------------------------
// get all todos
app.get('/api/todos', function (req, res) {
  // use mongoose to get all todos in the database
  Todo.find(function (err, todos) {
    // if there is an error retrieving, send the error. nothing after res.send(err) will execute
    if (err)
      res.send(err)
    res.json(todos); // return all todos in JSON format
  });
});

// create todo and send back all todos after creation
app.post('/api/todos', function (req, res) {
  // create a todo, information comes from AJAX request from Angular
  //  console.log(req.body);
  Todo.create({
    description: req.body.description,
    done: req.body.done,
    deleted: req.body.deleted,
    hide: req.body.hide
  }, function (err, todo) {
    if (err)
      res.send(err);
    // get and return all the todos after you create another
    Todo.find(function (err, todos) {
      if (err)
        res.send(err)
      res.send(todos);
    });
  });

});

// delete a todo
app.delete('/api/todos/:todo_id', function (req, res) {
  Todo.remove({
    _id: req.params.todo_id
  }, function (err, todo) {
    if (err)
      res.send(err);
    // get and return all the todos after you create another
    Todo.find(function (err, todos) {
      if (err)
        res.send(err)
      res.json(todos);
    });
  });
});

// change a todo
app.put('/api/todos/:todo_id', function (req, res) {

  Todo.findById(req.params.todo_id, function (err, todo) {
    todo.description = req.body.description;
    todo.done = req.body.done;
    todo.deleted = req.body.deleted;
    todo.hide = req.body.hide;
    todo.save();
  });

});

