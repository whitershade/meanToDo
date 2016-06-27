var mongoose = require('mongoose');

// define model =================
module.exports = mongoose.model('Todo', {
  id: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  done: {
    type: String,
    default: 'false'
  },
  deleted: {
    type: String,
    default: 'false'
  },
  hide: {
    type: String,
    default: 'false'
  }
});