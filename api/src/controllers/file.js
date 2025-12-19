const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { uploadToS3FromBuffer } = require("../utils");

router.post("/", async (req, res) => {
  const { files, folder } = req.body;

  if (!folder) return res.status(400).send({ ok: false, message: "No folder specified" });

  if (!files) return res.status(400).send({ ok: false, message: "No files uploaded" });

  // Ensure 'files' is always an array
  const filesArray = Array.isArray(files) ? files : [files];

  const uploadPromises = filesArray
    .map((file) => {
      const base64ContentArray = file.rawBody.split(",");
      const contentType = base64ContentArray[0].match(/[^:\s*]\w+\/[\w-+\d.]+(?=[;| ])/)[0];
      const extension = file.name.split(".").pop();
      const buffer = Buffer.from(base64ContentArray[1], "base64");
      const uuid = crypto.randomBytes(16).toString("hex");

      return uploadToS3FromBuffer(`file${folder}/${uuid}/${file.name}.${extension}`, buffer, contentType);
    })
    .filter((promise) => promise !== null); // Filter out the nulls

  try {
    const urls = await Promise.all(uploadPromises);
    return res.status(200).send({ ok: true, data: urls });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ ok: false, message: "Error in file upload" });
  }
});

module.exports = router;
