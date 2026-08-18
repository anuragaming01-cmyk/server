const express = require("express");
const path = require("path");
const admin = require("firebase-admin");

const app = express();

const PORT = process.env.PORT || 10000;

/*
 * Firebase Admin credentials Render Environment Variables
 * থেকে নেওয়া হবে।
 *
 * FIREBASE_PROJECT_ID
 * FIREBASE_CLIENT_EMAIL
 * FIREBASE_PRIVATE_KEY
 */

if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  console.error("Firebase environment variables are missing.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,

    clientEmail:
      process.env.FIREBASE_CLIENT_EMAIL,

    privateKey:
      process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  })
});

const db = admin.firestore();

app.use(express.json());

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


/*
 * Health check
 */

app.get("/health", (req, res) => {

  res.json({
    status: "online",
    service: "live-data-dashboard"
  });

});


/*
 * Get ALL saved Firestore records.
 *
 * No limit is used.
 */

app.get("/api/history", async (req, res) => {

  try {

    const snapshot =
      await db
        .collection("live_data_history")
        .orderBy("savedAt", "desc")
        .get();

    const results = [];

    snapshot.forEach(doc => {

      const data = doc.data();

      results.push({

        id:
          data.identifier || "",

        value:
          data.value || "",

        type:
          data.type || ""

      });

    });

    res.json(results);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Unable to load history"
    });

  }

});


/*
 * Save generic authorized API data.
 *
 * Expected body:
 *
 * {
 *   "identifier": "...",
 *   "value": "...",
 *   "type": "..."
 * }
 */

app.post("/api/save", async (req, res) => {

  try {

    const {
      identifier,
      value,
      type
    } = req.body;


    if (!identifier) {

      return res.status(400).json({
        error: "identifier is required"
      });

    }


    const safeId =
      String(identifier)
        .replace(
          /[\/\\.#$[\]]/g,
          "_"
        );


    const ref =
      db
        .collection("live_data_history")
        .doc(safeId);


    const existing =
      await ref.get();


    /*
     * Duplicate protection
     */

    if (existing.exists) {

      return res.json({
        saved: false,
        duplicate: true
      });

    }


    await ref.set({

      identifier:
        String(identifier),

      value:
        value == null
          ? ""
          : String(value),

      type:
        type == null
          ? ""
          : String(type),

      savedAt:
        admin.firestore.FieldValue.serverTimestamp()

    });


    res.json({
      saved: true,
      duplicate: false
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Save failed"
    });

  }

});


/*
 * Start server
 */

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
