const express = require("express");
const cors = require("cors");
const utils = require("./utils")
const fs = require('fs')
const Busboy = require("busboy")


const app = express();

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    return res.json({ message: "🦸" });
});

app.post("/request", (req, res) => {
    if (!req.body || !req.body.fileName) return res.status(400).json({ message: 'Missing "fileName"' });

    const fileId = utils.generateUniqueId();
    fs.createWriteStream(utils.getFilePath(req.body.fileName, fileId), { flags: "w" });

    return res.status(200).json({ fileId });
});

app.get('/status', (req, res) => {
    if (!req.query || !req.query.fileName || !req.query.fileId) return res.status(400).json({ message: 'Missing fileName or fileId' });

    fs.stat(utils.getFilePath(req.query.fileName, req.query.fileId), (err, fileDetails) => {
        if (err) return res.status(400).json({ message: 'No file with such details', details: req.query });

        return res.status(200).json({ totalChunkUploaded: fileDetails.size });
    })

});

app.post('/upload', (req, res) => {
    const contentRange = req.headers['content-range'];
    const fileId = req.headers['x-file-id'];

    if (!contentRange) {
        return res.status(400).json({ message: 'Missing "Content-Range" header' });
    }

    if (!fileId) {
        return res.status(400).json({ message: 'Missing "X-File-Id" header' });
    }

    const match = contentRange.match(/bytes=(\d+)-(\d+)\/(\d+)/);

    if (!match) {
        return res.status(400).json({ message: 'Invalid "Content-Range" Format' });
    }

    const rangeStart = Number(match[1]);
    const rangeEnd = Number(match[2]);
    const fileSize = Number(match[3]);

    if (rangeStart >= fileSize || rangeStart >= rangeEnd || rangeEnd > fileSize) {
        return res.status(400).json({ message: 'Invalid "Content-Range" provided' });
    }

    const busboy = new Busboy({ headers: req.headers });

    busboy.on('file', (_, fileStream, fileInfo) => {
        if (!fileId) {
            req.pause();
        }

        const filePath = utils.getFilePath(fileInfo.filename, fileId);

        fs.stat(filePath, (err, fileDetails) => {
            if (err) return res.status(400).json({ message: 'No file with such details', details: { fileName: fileInfo.filename, fileId } });

            if (fileDetails.size !== rangeStart) {
                return res.status(400).json({ message: 'Bad chunk' });
            }

            const writeStream = fs.createWriteStream(filePath, { flags: 'a' })
            fileStream.pipe(writeStream).on('error', (e) => {
                return res.status(500).json({ message: 'Internal server error' });
            });
        })
    });

    busboy.on('error', (e) => {
        return res.status(500).json({ message: 'Internal server error' });
    })

    busboy.on('finish', () => {
        return res.status(200).json({ message: 'Success' });
    });

    req.pipe(busboy);
});


app.listen(3000, () => {
    console.log("listening on port 3000");
});
