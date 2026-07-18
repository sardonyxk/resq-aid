import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`ResQ-Aid demo frontend running at http://localhost:${PORT}`);
});
