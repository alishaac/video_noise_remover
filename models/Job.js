const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['new', 'processed', 'failed'],
    default: 'new'
  },
  output: String
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
