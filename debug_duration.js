const { getVideoDurationInSeconds } = require('get-video-duration');
const { Readable } = require('stream');
const ffprobe = require('ffprobe-static');
const fs = require('fs');
const path = require('path');

console.log('ffprobe path:', ffprobe.path);

async function testDuration() {
    try {
        // We need a dummy video buffer. invalid buffer might throw, so let's try to mock or just see if ffprobe runs.
        // Since I cannot upload a file, I will just try to run ffprobe path check and maybe a mock stream if I had a file.
        // But first let's see if the binary is actually there and executable.

        // I can try to create a very small valid mp4 buffer or just check if the function throws "Invalid data" which means it tried to run.

        // Empty buffer will definitely fail, but let's see the error message.
        const buffer = Buffer.from('fake data');
        const stream = Readable.from(buffer);

        console.log('Attempting to get duration from fake buffer...');
        const duration = await getVideoDurationInSeconds(stream, {
            path: ffprobe.path
        });
        console.log('Duration:', duration);
    } catch (error) {
        console.error('Error (expected for fake data):', error.message);
        if (error.message.includes('No such file') || error.message.includes('spawn')) {
            console.error('CRITICAL: ffprobe might not be working.');
        } else {
            console.log('ffprobe seems to be running (it rejected the fake data).');
        }
    }
}

testDuration();
