document.getElementById('inputUrl').addEventListener('click', async (e) => {
  e.preventDefault();

  const videoUrl = document.getElementById('videoUrl').value;
  console.log(videoUrl);
  // Send a POST request to the server to initiate the video processing
  try {
    const response = await fetch('http://127.0.0.1:3000/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Change the content type to JSON
      },
      body: JSON.stringify({ videoUrl }), // Send the data as JSON
    });
    console.log('response = ' + response.ok);
    if (response.ok) {
      const data = await response.json();
      const jobId = data.jobId;
      console.log('searching for the job = ' + jobId);
      // Show the job status to the user and check for updates periodically
      console.log('Video processing started. Please wait for the download link to appear.');
      document.getElementById('jobId_').value = jobId; // Set the job ID in the input field
      alert('Video processing started. Please copy this id for checking the status after a few minutes - '+ jobId);
    } else {
      alert('Error processing the video. Please try again.');
    }
  } catch (error) {
    console.error('Error processing the video:', error);
  }
});

async function checkJobStatus(jobId) {
  console.log('CHECK JOB STATUS FUNCTION');
  const response = await fetch('http://127.0.0.1:3000/status/' + jobId);
  console.log('response = ' + response.ok);
  if (response.ok) {
    const data = await response.json();
    console.log('data = ' + data);
    if (data.status === 'processed') {
      document.getElementById('status').textContent = 'Job Status : Processed';
      document.getElementById('outputLink').href = '/outputs/'+ data.output;
      document.getElementById('outputLink').textContent = 'Download Processed Video';
    } else if (data.status === 'failed') {
      document.getElementById('status').textContent = 'Job Status : Failed';
    } else {
      setTimeout(() => {
        checkJobStatus(jobId);
      }, 3000);
    }
  } else {
    console.error('Error retrieving job status: ', response.status);
  }
}

document.getElementById('jobIdInputSubmit').addEventListener('click', async (e) => {
  console.log('job id input submit');

  const id = document.getElementById('jobIdInput').value;
  checkJobStatus(id);
});
