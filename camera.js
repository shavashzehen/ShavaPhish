const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  });

function capture() {
  context.drawImage(video, 0, 0, 320, 240);
  let image_data = canvas.toDataURL('image/png');
  
  fetch('/upload', {
    method: 'POST',
    body: JSON.stringify({ image: image_data }),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(() => alert('✅ Image Captured & Sent'));
}
