const express = require("express");
const path = require("path");
const admin = require("firebase-admin");

const app = express();

const PORT = process.env.PORT || 10000;


/* =========================================
   EXPRESS
========================================= */

app.use(express.json());

/*
 * index.html root folder-এ আছে
 */
app.use(express.static(__dirname));


/* =========================================
   FIREBASE ADMIN
========================================= */

const projectId =
  process.env.FIREBASE_PROJECT_ID;

const clientEmail =
  process.env.FIREBASE_CLIENT_EMAIL;

const privateKey =
  process.env.FIREBASE_PRIVATE_KEY;


if (
  !projectId ||
  !clientEmail ||
  !privateKey
) {

  console.error(
    "ERROR: Firebase environment variables are missing."
  );

  console.error(
    "Required:"
  );

  console.error(
    "FIREBASE_PROJECT_ID"
  );

  console.error(
    "FIREBASE_CLIENT_EMAIL"
  );

  console.error(
    "FIREBASE_PRIVATE_KEY"
  );

  process.exit(1);
}


admin.initializeApp({

  credential:
    admin.credential.cert({

      projectId:
        projectId,

      clientEmail:
        clientEmail,

      privateKey:
        privateKey.replace(
          /\\n/g,
          "\n"
        )

    })

});


const db =
  admin.firestore();


/* =========================================
   HOME
========================================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );

});


/* =========================================
   HEALTH CHECK
========================================= */

app.get(
  "/health",
  (req, res) => {

    res.json({

      status:
        "online",

      service:
        "live-data-dashboard",

      firestore:
        "connected"

    });

  }
);


/* =========================================
   GET ALL FIRESTORE HISTORY
========================================= */

app.get(
  "/api/history",
  async (req, res) => {

    try {

      const snapshot =
        await db
          .collection(
            "live_data_history"
          )
          .orderBy(
            "savedAt",
            "desc"
          )
          .get();


      const results = [];


      snapshot.forEach(
        document => {

          const data =
            document.data();


          results.push({

            id:
              data.identifier ||
              "",

            value:
              data.value ||
              "",

            type:
              data.type ||
              ""

          });

        }
      );


      /*
       * IMPORTANT:
       *
       * এখানে কোনো limit()
       * ব্যবহার করা হয়নি।
       *
       * Firestore-এ যতগুলো
       * record থাকবে,
       * সবগুলো return হবে।
       */


      res.json(results);

    }

    catch (error) {

      console.error(
        "Firestore read error:",
        error
      );


      res.status(500).json({

        error:
          "Failed to load Firestore history"

      });

    }

  }
);


/* =========================================
   SAVE RECORD
========================================= */

app.post(
  "/api/save",
  async (req, res) => {

    try {

      const {
        identifier,
        value,
        type
      } = req.body;


      /*
       * Identifier required
       */

      if (
        identifier === undefined ||
        identifier === null ||
        String(identifier).trim() === ""
      ) {

        return res.status(400).json({

          error:
            "identifier is required"

        });

      }


      const cleanIdentifier =
        String(identifier).trim();


      /*
       * Firestore document ID
       * safe করা
       */

      const safeId =
        cleanIdentifier
          .replace(
            /[\/\\.#$[\]]/g,
            "_"
          );


      const recordRef =
        db
          .collection(
            "live_data_history"
          )
          .doc(safeId);


      /*
       * Duplicate check
       */

      const existing =
        await recordRef.get();


      if (existing.exists) {

        return res.json({

          success:
            true,

          saved:
            false,

          duplicate:
            true,

          message:
            "Record already exists"

        });

      }


      /*
       * New record save
       */

      await recordRef.set({

        identifier:
          cleanIdentifier,

        value:
          value === undefined ||
          value === null
            ? ""
            : String(value),

        type:
          type === undefined ||
          type === null
            ? ""
            : String(type),

        savedAt:
          admin.firestore
            .FieldValue
            .serverTimestamp()

      });


      res.json({

        success:
          true,

        saved:
          true,

        duplicate:
          false,

        message:
          "Record saved successfully"

      });

    }

    catch (error) {

      console.error(
        "Firestore save error:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          "Failed to save record"

      });

    }

  }
);


/* =========================================
   404 API
========================================= */

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({

      error:
        "API endpoint not found"

    });

  }
);


/* =========================================
   SERVER ERROR
========================================= */

app.use(
  (error, req, res, next) => {

    console.error(
      "Server error:",
      error
    );


    res.status(500).json({

      error:
        "Internal server error"

    });

  }
);


/* =========================================
   START SERVER
========================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "================================="
    );

    console.log(
      "Live Data Dashboard Server"
    );

    console.log(
      "================================="
    );

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      "Firestore: Connected"
    );

    console.log(
      "History limit: NONE"
    );

    console.log(
      "================================="
    );

  }
);
