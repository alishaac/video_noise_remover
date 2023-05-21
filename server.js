const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const Job = require("./models/Job");
const Queue = require("bull");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/video_noise_reduction", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    startServer();
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Create the videoQueue
const videoQueue = new Queue("videoQueue", {
  redis: {
    host: "localhost",
    port: 5545,
    // Add any other Redis connection options if necessary
  },
});

videoQueue.on("error", (error) => {
  console.error("Queue error:", error);
});

function startServer() {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

// Function to process the video
async function processVideo(videoUrl) {
  const ffmpegPath =
    "C:/Users/HP/Downloads/ffmpeg-2023-05-18-git-01d9a84ef5-full_build/ffmpeg/bin/ffmpeg";
  const outputDirectory = path.join(__dirname, "outputs");
  const outputFilePath = path.join(
    outputDirectory,
    "output-video-" + Date.now() + ".mp4"
  );

  const command = `${ffmpegPath} -i "${videoUrl}" -af "highpass=f=200,lowpass=f=3000,afftdn=nf=-25" -y ${outputFilePath}`;

  try {
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(command, { shell: true });
      console.log("Video processing started: " + videoUrl);

      ffmpegProcess.stderr.on("data", (data) => {
        console.error("Error during video processing:", data.toString());
        // You can handle the error message here or append it to an error log
      });

      ffmpegProcess.on("error", (error) => {
        console.error("Error during video processing:", error);
        reject(error);
      });

      // const finalPath = path.join(__dirname, outputFilePath);
      const finalPath = outputFilePath;
      console.log("outputFilePath = " + finalPath);

      ffmpegProcess.on("close", (code) => {
        if (code === 0) {
          console.log("Video processing successful: " + finalPath);
          resolve(finalPath);
        } else {
          console.error("Video processing failed with exit code:", code);
          reject(new Error("Video processing failed"));
        }
      });
    });
  } catch (error) {
    console.log("ERROR IN PROCESSING THE VIDEO" + error);
  }
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/process", async (req, res) => {
  const { videoUrl } = req.body;
  console.log(videoUrl);

  try {
    // Create a new job in the database
    const job = await Job.create({ videoUrl });
    console.log("job created");

    // Add the job to the queue
    const addedJob = await videoQueue.add({
      jobId: job._id,
      videoUrl: videoUrl,
    });
    console.log("video added to queue");

    res.status(200).send({ jobId: job._id });
    console.log("process function - job id sent " + job._id);
  } catch (error) {
    console.error("Error processing the video: ", error);
    res.status(500).send("Error processing the video");
  }
});

app.get("/status/:jobId", async (req, res) => {
  console.log("checking the status of the following job " + req.params);
  const jobId = req.params.jobId;
  console.log("job id to be searched = " + jobId);
  try {
    // Find the job in the database
    const job = await Job.findById(jobId);

    if (!job) {
      res.status(404).send("Job not found");
    } else {
      res.send({ status: job.status, output: job.output });
    }
  } catch (error) {
    console.error("Error retrieving job status:", error);
    res.status(500).send("Error retrieving job status");
  }
});

videoQueue.process(async (job) => {
  console.log(job.data);
  console.log(job.data.videoUrl);
  const videoUrl = job.data.videoUrl;
  console.log(videoUrl);
  try {
    // Update the job status to 'processing' in the database
    console.log("job id " + job.id + " " + job.data.jobId);
    await Job.findByIdAndUpdate(mongoose.Types.ObjectId(job.data.jobId), {
      status: "processing",
    });
    console.log("job processing");
    // Process the video
    const outputFilePath = await processVideo(videoUrl);
    console.log("job processed " + outputFilePath);
    // Update the job status to 'processed' and set the output file
    await Job.findByIdAndUpdate(mongoose.Types.ObjectId(job.data.jobId), {
      status: "processed",
      output: path.basename(outputFilePath),
    });
    console.log("job updated");
  } catch (error) {
    console.error("Video processing error:", error);

    // Update the job status to 'failed' in the database
    await Job.findByIdAndUpdate(mongoose.Types.ObjectId(job.data.jobId), {
      status: "failed",
    });
  }
});
