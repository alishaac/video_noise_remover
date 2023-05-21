const ffmpeg = require('ffmpeg-static');
const Queue = require('bull');
const videoQueue = new Queue('videoQueue');

// Function to add a job to the queue
const addVideoJob = (videoUrl) => {
  const job = videoQueue.add({ videoUrl });
  return job.id;
};

// Function to check job status
const getJobStatus = async (jobId) => {
  const job = await videoQueue.getJob(jobId);
  if (job === null) {
    return 'Job not found';
  }
  return job.status;
};

// Function to process the video
const processVideo = async (videoUrl) => {
  // Perform the video processing using ffmpeg
  // Update the logic as per your requirements

  try {
    await new Promise((resolve, reject) => {
      // Perform the video processing using ffmpeg command
      const command = `${ffmpeg.path} -i "${videoUrl}" -af "highpass=f=200 lowpass=f=3000,afftdn=nf=-25" output-video.mp4`;
      ffmpeg.exec(command, (err, output) => {
        if (err) {
          console.error('Video processing failed:', err);
          reject(err);
        } else {
          console.log('Video processing successful');
          resolve();
        }
      });
    });
  } catch (error) {
    throw new Error('Video processing failed');
  }
};

// Worker process to process the videos in the queue
videoQueue.process(async (job) => {
  const { videoUrl } = job.data;

  try {
    // Update the job status to 'processing' in the database
    await job.update({ status: 'processing' });

    // Process the video
    await processVideo(videoUrl);

    // Update the job status to 'processed' in the database
    await job.update({ status: 'processed' });
  } catch (error) {
    console.error('Video processing error:', error);

    // Update the job status to 'failed' in the database
    await job.update({ status: 'failed' });
  }
});
