import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  seedDatabase()
    .then((result) => {
      if (result.seeded) {
        logger.info(result, "Seed complete");
      } else {
        logger.info({ reason: result.reason }, "Seed skipped");
      }
    })
    .catch((seedErr) => {
      logger.error({ err: seedErr }, "Startup seed failed");
    });
});
