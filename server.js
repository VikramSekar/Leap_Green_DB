const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require('mysql2/promise'); // Use mysql2/promise for Promises
// const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());
app.options('*', cors()); // Enable preflight requests



// Create a connection pool to the database using mysql2/promise
const db = mysql.createPool({
  host: 'localhost',
  user: 'vikram',
  password: 'vikram1234',
  database: 'leapgreen',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// Login Table Starts
// Route to handle form data submission for shifts
app.post('/submitShift', async (req, res) => {
  const { shift, name, completed_comments, pending_comments, handed_over_to } = req.body;

  try {
    const query = "INSERT INTO shift_data (shift, name, completed_comments, pending_comments, handed_over_to) VALUES (?, ?, ?, ?, ?)";
    await db.query(query, [shift, name, completed_comments, pending_comments, handed_over_to]);
    res.status(200).send('Shift data submitted successfully!');
  }
  catch (error) {
    console.error('Error submitting shift data:', error);
    res.status(500).send('Error submitting shift data.');
  }
});
// Login Table Ends

// Dashboard Tables Starts
// fetch shiftdata from sql Table
app.get('/shiftData', async (req, res) => {
  try {
    const query = "SELECT * FROM shift_data ORDER BY created_at DESC LIMIT 2";
    const results = await db.query(query);

    // If the results include extra data, extract only the rows
    if (results.length > 0 && Array.isArray(results[0])) {
      // Assuming results[0] contains your data
      const data = results[0]; // Grab the first array, which contains your actual data
      return res.json(data); // Return only the actual data
    }

    res.json(results); // If the structure is different, adjust accordingly
  } catch (error) {
    console.error('Error fetching shift data:', error);
    res.status(500).send('Error fetching shift data.');
  }
});

// Route to handle pass corrections submissions
app.post('/submitCorrections', async (req, res) => {
  const correctionsData = req.body;

  try {
    const query = "INSERT INTO pass_corrections (pass, model, corrections) VALUES (?, ?, ?)";
    const promises = correctionsData.map(({ pass, model, corrections }) =>
      db.query(query, [pass, model, corrections])
    );
    await Promise.all(promises);
    res.status(200).send('Pass corrections submitted successfully!');
  } catch (error) {
    console.error('Error submitting pass corrections:', error);
    res.status(500).send('Error submitting pass corrections.');
  }
});

// Fetch Corrections
app.get('/get-Corrections', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM pass_corrections ORDER BY timestamp_column_name DESC LIMIT 8");
    res.json(rows);
  } catch (error) {
    console.error('Error fetching corrections:', error);
    res.status(500).send('Error fetching corrections.');
  }
});

// Insert Emails
app.post('/save-emails', async (req, res) => {
  const emails = req.body;

  const values = emails.map(email => [email.revision, email.email, email.verified, email.remarks]);

  try {
    const query = "INSERT INTO email_verifications (revision, email, verified, remarks) VALUES ?";
    await db.query(query, [values]);

    res.status(200).send('Emails saved successfully!');
  } catch (error) {
    console.error('Error saving emails:', error);
    res.status(500).send('Error saving emails.');
  }
});

// Fetch Emails
// app.get('/fetch-emails', async (req, res) => {
//   const query = `SELECT * from email_verifications`;
//   try {
//     const [rows] = await db.query(query);
//     res.status(200).json(rows);
//   } catch (err) {
//     console.error('Error fetching data:', err);
//     res.status(500).send('Database Error');
//   }
// });



// Insert NWP model data into the SQL table
app.get('/fetch-emails', async (req, res) => {
  try {
    // First, get the created_at value of the last entry
    const lastEntryQuery = `SELECT created_at FROM email_verifications ORDER BY created_at DESC LIMIT 1`;
    const [lastEntryResult] = await db.query(lastEntryQuery);

    if (lastEntryResult.length === 0) {
      return res.status(404).send('No data found.');
    }

    const lastCreatedAt = lastEntryResult[0].created_at;

    // Then, fetch all records with that created_at value
    const sql = `SELECT * FROM email_verifications WHERE created_at = ?`;
    const [results] = await db.query(sql, [lastCreatedAt]);

    res.json(results); // Send all entries with the latest created_at
  } catch (err) {
    console.error('Error fetching data:', err);
    return res.status(500).send('Failed to fetch data.');
  }
});

// Insertion NWP Models
app.post('/api/submit', (req, res) => {
  const models = req.body;
  models.forEach(model => {
    const { modelName, utcUpdate, numOfDays, numOfFiles, d, e, fg, pt, remarks, work_description, pending_work_description } = model;
    const sql = `
          INSERT INTO nwp_models 
          (modelName, utcUpdate, numOfDays, numOfFiles, d, e, fg, pt, remarks, work_description, pending_work_description) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
      `;

    db.query(sql, [modelName, utcUpdate, numOfDays, numOfFiles, d, e, fg, pt, remarks, work_description, pending_work_description], (err, result) => {
      if (err) {
        console.error('Error inserting data:', err);
        return res.status(500).send('Failed to insert data.');
      }
    });
  });

  res.send('Data inserted successfully!');
});

// Fetching NWP model table data from Database
// app.get('/api/fetch-models', async (req, res) => {
//   const sql = `SELECT * FROM nwp_models ORDER BY id DESC LIMIT 1`;
//   try {
//     const [results] = await db.query(sql); // Use await to handle the promise
//     res.json(results);
//   } catch (err) {
//     console.error('Error fetching data:', err);
//     return res.status(500).send('Failed to fetch data.');
//   }
// });
app.get('/api/fetch-models', async (req, res) => {
  try {
    // First, get the created_at value of the last entry
    const lastEntryQuery = `SELECT created_at FROM nwp_models ORDER BY created_at DESC LIMIT 1`;
    const [lastEntryResult] = await db.query(lastEntryQuery);

    if (lastEntryResult.length === 0) {
      return res.status(404).send('No data found.');
    }

    const lastCreatedAt = lastEntryResult[0].created_at;

    // Then, fetch all records with that created_at value
    const sql = `SELECT * FROM nwp_models WHERE created_at = ?`;
    const [results] = await db.query(sql, [lastCreatedAt]);

    res.json(results); // Send all entries with the latest created_at
  } catch (err) {
    console.error('Error fetching data:', err);
    return res.status(500).send('Failed to fetch data.');
  }
});

// Endpoint to fetch data from the database
app.get('/api/models', async (req, res) => {
  const sql = `SELECT * FROM nwp_models WHERE modelName = 'ICON 13' AND utcUpdate = 00 ORDER BY id DESC LIMIT 1`;


  try {
    const [results] = await db.query(sql); // Use await to handle the promise
    res.json(results);
  } catch (err) {
    console.error('Error fetching data:', err);
    return res.status(500).send('Failed to fetch data.');
  }
});
// Dashboard Tables Ends








/////   Shift_A  Starts    /////
app.post('/shiftA_preworkstatus', (req, res) => {
  const preWorkStatus = req.body;

  // SQL query to insert the form data into the database
  const sql = `
      INSERT INTO shiftA_preworkstatus (operation, TN, RJ, MP, MH)
      VALUES (?, ?, ?, ?, ?)
  `;

  preWorkStatus.forEach((row) => {
    db.query(sql, [row.operation, row.TN, row.RJ, row.MP, row.MH], (err, result) => {
      if (err) {
        console.error('Error inserting data:', err);
        return res.status(500).send('Error inserting data');
      }
    });
  });

  res.send('Pre Work Status data inserted successfully!');
});
app.get('/shiftA_preworkstatuslast', async (req, res) => {
  const sql = 'SELECT * FROM shiftA_preworkstatus ORDER BY created_at DESC LIMIT 6';

  try {
    const [rows] = await db.query(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

app.post('/shiftA_forecast', async (req, res) => {
  const forecastData = req.body;

  // Prepare the SQL query to insert forecast data
  const sql = `
      INSERT INTO shiftA_forecast (forecast_type, our_group, ldc, mail, main_group, tangedco, teca, tn_15_days, rj_15_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Create an array of promises for each insertion
  const promises = [
    db.query(sql, ['TN Forecast 8:00 Hours', forecastData.tnForecast800.ourGroup, forecastData.tnForecast800.ldc, forecastData.tnForecast800.mail, null, null, null, null, null]),
    db.query(sql, ['TN Forecast 9:00 Hours', forecastData.tnForecast900.ourGroup, null, forecastData.tnForecast900.mail, forecastData.tnForecast900.mainGroup, null, null, null, null]),
    db.query(sql, ['RJ Forecast 9:00 Hours', forecastData.rjForecast900.ourGroup, forecastData.rjForecast900.ldc, forecastData.rjForecast900.mail, null, null, null, null, null]),
    db.query(sql, ['TN Forecast 13:00 Hours', forecastData.tnForecast1300.ourGroup, forecastData.tnForecast1300.ldc, forecastData.tnForecast1300.mail, null, null, null, null, null]),
    db.query(sql, ['TANGEDCO', null, null, null, null, forecastData.tangedco.tangedco, null, null, null]),
    db.query(sql, ['TECA', null, null, null, null, null, forecastData.teca.teca, null, null]),
    db.query(sql, ['TN 15 Days Forecast', null, null, null, null, null, null, forecastData.tn15DaysForecast.tn15Days, null]),
    db.query(sql, ['RJ 15 Days Forecast', null, null, null, null, null, null, null, forecastData.rj15DaysForecast.rj15Days]),
  ];

  try {
    // Wait for all promises to complete
    await Promise.all(promises);
    res.status(200).json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error during insertion:', error);
    res.status(500).json({ error: 'Error saving data' });
  }
});

// app.get('/shiftA_forecastlast', async (req, res) => {
//   const sql = 'SELECT * FROM shiftA_forecast ORDER BY created_at DESC LIMIT 8';

//   try {
//     const [rows] = await db.query(sql);
//     res.status(200).json(rows);
//   } catch (error) {
//     console.error('Error fetching data:', error);
//     res.status(500).json({ error: 'Error fetching data' });
//   }
// });

app.get('/shiftA_forecastlast', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM shiftA_forecast ORDER BY created_at DESC LIMIT 8');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching forecast data:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/shiftA_reports', async (req, res) => {
  const reportsData = req.body;

  try {
    // Loop through each report and insert data one by one using async/await
    for (const report of reportsData) {
      const { reportName, TN, RJ, MP, MH } = report;

      // Prepare SQL query for inserting report data
      const query = `
        INSERT INTO shifta_reports (report_name, TN, RJ, MP, MH)
        VALUES (?, ?, ?, ?, ?)
      `;

      // Await the db query to insert each report
      const result = await db.query(query, [
        reportName,
        TN ? 1 : 0,
        RJ ? 1 : 0,
        MP ? 1 : 0,
        MH ? 1 : 0
      ]);
    }

    // Sending a success response after all reports are inserted
    return res.status(200).json({ message: 'Reports status data inserted successfully' });
  } catch (error) {
    console.error('Error inserting report status:', error);
    return res.status(500).send('Failed to insert report data');
  }
});
app.get('/shiftA_reportlast', async (req, res) => {
  const sql = 'SELECT * FROM shiftA_reports ORDER BY created_at DESC LIMIT 11';

  try {
    const [rows] = await db.query(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

app.post("/shiftA_commonworks", async (req, res) => {
  const { ZYGRIB, NOWCASTStatus, TNWeatherAnalysis } = req.body;

  try {
    // Insert ZYGRIB data
    const zygribQuery = `
          INSERT INTO shiftA_commonworks (operation, TN, RJ, MP, MH) 
          VALUES ('ZYGRIB', ?, ?, ?, ?)
      `;
    await db.query(zygribQuery, [ZYGRIB.TN, ZYGRIB.RJ, ZYGRIB.MP, ZYGRIB.MH]);

    // Insert NOWCAST data
    const nowcastQuery = `
          INSERT INTO shiftA_commonworks (operation, TN, RJ, MP, MH) 
          VALUES ('NOWCAST', ?, ?, ?, ?)
      `;
    await db.query(nowcastQuery, [NOWCASTStatus.TN, NOWCASTStatus.RJ, NOWCASTStatus.MP, NOWCASTStatus.MH]);

    // Insert TN Weather Analysis data
    const tnWeatherQuery = `
          INSERT INTO shiftA_commonworks (operation, TN, RJ, MP, MH) 
          VALUES ('TN Weather Analysis', ?, 'N/A', 'N/A', 'N/A')
      `;
    await db.query(tnWeatherQuery, [TNWeatherAnalysis]);

    // console.log("All data inserted successfully");
    return res.status(200).send("Data inserted successfully");
  } catch (error) {
    console.error("Error during data insertion:", error);
    return res.status(500).send("Error inserting data");
  }
});
app.get("/shiftA_commonworkslast", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM shiftA_commonworks ORDER BY created_at DESC LIMIT 3");
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).send("Error fetching data");
  }
});

app.post('/shiftA_remarks', async (req, res) => {
  const { work_description, work_status } = req.body;

  const query = 'INSERT INTO shiftA_remarks (work_description, work_status) VALUES (?, ?)';

  try {
    // Use await to handle the db.query
    const results = await db.query(query, [work_description, work_status]);

    // Sending a success response with 200 status code
    return res.status(200).json({ message: 'Data saved successfully', id: results.insertId });
  } catch (error) {
    console.error('Error during data insertion:', error);
    return res.status(500).send('Error saving data'); // Send an error response
  }
});
app.get("/shiftA_remarkslast", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM shiftA_remarks ORDER BY created_at DESC LIMIT 1");
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).send("Error fetching data");
  }
});
/////   Shift_A  Ends    /////









/////   Shift_B  Starts    /////
app.post('/shiftB_forecast', async (req, res) => {
  const forecastData = req.body;

  // Prepare the SQL query to insert forecast data
  const sql = `
      INSERT INTO shiftB_forecast (forecast_type, our_group, ldc, mail, main_group, tangedco, teca, tn_15_days, rj_15_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Create an array of promises for each insertion
  const promises = [
    db.query(sql, ['TN Forecast 17:00 Hours', forecastData.tnForecast1700.ourGroup, forecastData.tnForecast1700.ldc, forecastData.tnForecast1700.mail, null, null, null, null, null]),
    db.query(sql, ['TN Forecast 21:00 Hours', forecastData.tnForecast2100.ourGroup, null, forecastData.tnForecast2100.mail, forecastData.tnForecast2100.mainGroup, null, null, null, null]),
    db.query(sql, ['RJ Forecast 21:00 Hours', forecastData.rjForecast2100.ourGroup, forecastData.rjForecast2100.ldc, forecastData.rjForecast2100.mail, null, null, null, null, null]),
    db.query(sql, ['TANGEDCO', null, null, null, null, forecastData.tangedco.tangedco, null, null, null]),
    db.query(sql, ['TECA', null, null, null, null, null, forecastData.teca.teca, null, null]),
    db.query(sql, ['TN 15 Days Forecast', null, null, null, null, null, null, forecastData.tn15DaysForecast.tn15Days, null]),
    db.query(sql, ['RJ 15 Days Forecast', null, null, null, null, null, null, null, forecastData.rj15DaysForecast.rj15Days]),
  ];




  try {
    // Wait for all promises to complete
    await Promise.all(promises);
    res.status(200).json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error during insertion:', error);
    res.status(500).json({ error: 'Error saving data' });
  }
});
app.get('/shiftB_forecastlast', async (req, res) => {
  const sql = 'SELECT * FROM shiftB_forecast ORDER BY created_at DESC LIMIT 7';

  try {
    const [rows] = await db.query(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

app.post('/shiftB_demandforecast', async (req, res) => {
  const forecastData = req.body;

  // Prepare the SQL query to insert demand forecast data
  const sql = `
      INSERT INTO shiftB_demandforecast (forecast_type, tn, our_group, main_group, accuracy_report, demand_dsm_report)
      VALUES (?, ?, ?, ?, ?, ?)
  `;

  // Create an array of promises for each forecast type
  const promises = [
    db.query(sql, ['DEMAND ZYGRIB', forecastData.demandZygrib.tn, null, null, null, null]),
    db.query(sql, ['TN Demand Forecast 18:00 Hours', null, forecastData.tnDemandForecast1800.ourGroup, forecastData.tnDemandForecast1800.mainGroup, null, null]),
    db.query(sql, ['Demand Reports', null, null, null, forecastData.demandReports.accuracyReport, forecastData.demandReports.demandDsmReport]),
  ];

  try {
    // Wait for all promises to complete
    await Promise.all(promises);
    res.status(200).json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error during insertion:', error);
    res.status(500).json({ error: 'Error saving data' });
  }
});
app.get('/shiftB_demandforecastlast', async (req, res) => {
  const sql = `
      SELECT 
          forecast_type, 
          tn, 
          our_group, 
          main_group, 
          accuracy_report, 
          demand_dsm_report
      FROM shiftB_demandforecast
      WHERE created_at = (SELECT MAX(created_at) FROM shiftB_demandforecast)
  `;
  try {
    const [rows] = await db.query(sql);
    res.status(200).json(rows);  // Ensure correct fields are returned
  } catch (error) {
    console.error('Error fetching demand forecast data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

app.post('/shiftB_solarforecast', async (req, res) => {
  const { watson, brookfields, brookfieldsmail, accuracyReport, solarDsmReport, actualUpdated, actualNotUpdated } = req.body;

  const querySelect = 'SELECT * FROM shiftB_solarforecast ORDER BY created_at DESC LIMIT 1';
  const queryInsert = `
      INSERT INTO shiftB_solarforecast 
      (watson, brookfields, brookfieldsmail, accuracy_report, solar_dsm_report, actual_updated, actual_not_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const [rows] = await db.query(querySelect);
    const latestRow = rows[0];

    // Compare incoming data with the latest entry
    if (
      latestRow &&
      latestRow.watson === watson &&
      latestRow.brookfields === brookfields &&
      latestRow.brookfieldsmail === brookfieldsmail &&
      latestRow.accuracy_report === accuracyReport &&
      latestRow.solar_dsm_report === solarDsmReport &&
      latestRow.actual_updated === actualUpdated &&
      latestRow.actual_not_updated === actualNotUpdated
    ) {
      return res.status(200).json({ message: 'No changes detected, data not inserted.' });
    }

    // Insert only if there's a change
    await db.query(queryInsert, [
      watson,
      brookfields,
      brookfieldsmail,
      accuracyReport,
      solarDsmReport,
      actualUpdated,
      actualNotUpdated,
    ]);
    res.status(200).json({ message: 'Data inserted successfully' });
  } catch (error) {
    console.error('Error during insertion:', error);
    res.status(500).json({ error: 'Error inserting data' });
  }
});

app.get('/shiftB_solarforecastlast', async (req, res) => {
  const query = 'SELECT * FROM shiftB_solarforecast ORDER BY created_at DESC LIMIT 1';
  try {
    const [rows] = await db.query(query);

    if (rows.length > 0) {
      const row = rows[0]; // Get the first row
      // Map tinyint values to true/false
      const result = {
        watson: !!row.watson,
        brookfields: !!row.brookfields,
        brookfieldsmail: !!row.brookfieldsmail,
        accuracyReport: !!row.accuracy_report,
        solarDsmReport: !!row.solar_dsm_report,
        actualUpdated: !!row.actual_updated,
        actualNotUpdated: !!row.actual_not_updated,
      };
      res.status(200).json(result);
    } else {
      res.status(200).json({
        watson: false,
        brookfields: false,
        brookfieldsmail: false,
        accuracyReport: false,
        solarDsmReport: false,
        actualUpdated: false,
        actualNotUpdated: false,
      }); // Default values if no rows exist
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// app.post("/shiftB_commonworks", async (req, res) => {
//   const { ZYGRIB, NOWCASTStatus, TNWeatherAnalysis } = req.body;

//   try {
//     // Insert ZYGRIB data
//     const zygribQuery = `
//           INSERT INTO shiftB_commonworks (operation, TN, RJ, MP, MH) 
//           VALUES ('ZYGRIB', ?, ?, ?, ?)
//       `;
//     await db.query(zygribQuery, [ZYGRIB.TN, ZYGRIB.RJ, ZYGRIB.MP, ZYGRIB.MH]);

//     // Insert NOWCAST data
//     const nowcastQuery = `
//           INSERT INTO shiftB_commonworks (operation, TN, RJ, MP, MH) 
//           VALUES ('NOWCAST', ?, ?, ?, ?)
//       `;
//     await db.query(nowcastQuery, [NOWCASTStatus.TN, NOWCASTStatus.RJ, NOWCASTStatus.MP, NOWCASTStatus.MH]);

//     // Insert TN Weather Analysis data
//     const tnWeatherQuery = `
//           INSERT INTO shiftB_commonworks (operation, TN, RJ, MP, MH) 
//           VALUES ('TN Weather Analysis', ?, 'N/A', 'N/A', 'N/A')
//       `;
//     await db.query(tnWeatherQuery, [TNWeatherAnalysis]);

//     // console.log("All data inserted successfully");
//     return res.status(200).send("Data inserted successfully");
//   } catch (error) {
//     console.error("Error during data insertion:", error);
//     return res.status(500).send("Error inserting data");
//   }
// });
// app.get("/shiftB_commonworkslast", async (req, res) => {
//   try {
//     const [rows] = await db.query("SELECT * FROM shiftB_commonworks ORDER BY created_at DESC LIMIT 3");
//     return res.status(200).json(rows);
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     return res.status(500).send("Error fetching data");
//   }
// });

app.post("/shiftB_commonworks", async (req, res) => {
  const { ZYGRIB, NOWCASTStatus, TNWeatherAnalysis } = req.body;

  try {
    // Insert ZYGRIB data
    const zygribQuery = `
          INSERT INTO shiftB_commonworks (operation, TN, RJ, MP, MH) 
          VALUES ('ZYGRIB', ?, ?, ?, ?)
      `;
    await db.query(zygribQuery, [ZYGRIB.TN, ZYGRIB.RJ, ZYGRIB.MP, ZYGRIB.MH]);

    // Insert NOWCAST data
    const nowcastQuery = `
          INSERT INTO shiftB_commonworks (operation, TN, RJ, MP, MH) 
          VALUES ('NOWCAST', ?, ?, ?, ?)
      `;
    await db.query(nowcastQuery, [NOWCASTStatus.TN, NOWCASTStatus.RJ, NOWCASTStatus.MP, NOWCASTStatus.MH]);

    // Insert TN Weather Analysis data
    const tnWeatherQuery = `
          INSERT INTO shiftB_commonworks (operation, TN, RJ, MP, MH) 
          VALUES ('TN Weather Analysis', ?, 'N/A', 'N/A', 'N/A')
      `;
    await db.query(tnWeatherQuery, [TNWeatherAnalysis]);

    // console.log("All data inserted successfully");
    return res.status(200).send("Data inserted successfully");
  } catch (error) {
    console.error("Error during data insertion:", error);
    return res.status(500).send("Error inserting data");
  }
});
app.get("/shiftB_commonworkslast", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM shiftB_commonworks ORDER BY created_at DESC LIMIT 3");
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).send("Error fetching data");
  }
});

app.post('/shiftB_remarks', async (req, res) => {
  const { work_description, work_status } = req.body;

  const query = 'INSERT INTO shiftB_remarks (work_description, work_status) VALUES (?, ?)';

  try {
    // Use await to handle the db.query
    const results = await db.query(query, [work_description, work_status]);

    // Sending a success response with 200 status code
    return res.status(200).json({ message: 'Data saved successfully', id: results.insertId });
  } catch (error) {
    console.error('Error during data insertion:', error);
    return res.status(500).send('Error saving data'); // Send an error response
  }
});
app.get("/shiftB_remarkslast", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM shiftB_remarks ORDER BY created_at DESC LIMIT 1");
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).send("Error fetching data");
  }
});
/////   Shift_B  Ends    /////






/////   Shift_C  Starts    /////
app.post('/shiftC_forecaststatus', (req, res) => {
  const forecasts = req.body;

  forecasts.forEach(forecast => {
    const { forecast: forecastName, status } = forecast;

    status.forEach(item => {
      const { label, checked } = item;
      const sql = 'INSERT INTO shiftC_forecaststatus (forecast, status_label, status_value) VALUES (?, ?, ?)';
      const values = [forecastName, label, checked ? 1 : 0];

      db.query(sql, values, (err, result) => {
        if (err) {
          console.error('Error inserting data:', err);
          return res.status(500).send('Error inserting data');
        }
      });
    });
  });

  res.status(201).send('Data submitted successfully');
});
app.get('/shiftC_forecaststatus/last', async (req, res) => {
  try {
    // Query to get all entries from the table
    const [results] = await db.query('SELECT * FROM shiftC_forecaststatus ORDER BY created_at DESC LIMIT 7');

    if (results.length > 0) {
      res.status(200).json(results); // Return all entries
    } else {
      res.status(404).send('No entries found');
    }
  } catch (error) {
    console.error('Error fetching forecast statuses:', error);
    res.status(500).send('Internal Server Error');
  }
});

// app.post("/shiftC_commonworks", async (req, res) => {
//   const { ZYGRIB, NOWCASTStatus, TNWeatherAnalysis } = req.body;

//   try {
//     // Insert ZYGRIB data
//     const zygribQuery = `
//           INSERT INTO shiftC_commonworks (operation, TN, RJ, MP, MH) 
//           VALUES ('ZYGRIB', ?, ?, ?, ?)
//       `;
//     await db.query(zygribQuery, [ZYGRIB.TN, ZYGRIB.RJ, ZYGRIB.MP, ZYGRIB.MH]);

//     // Insert NOWCAST data
//     const nowcastQuery = `
//           INSERT INTO shiftC_commonworks (operation, TN, RJ, MP, MH) 
//           VALUES ('NOWCAST', ?, ?, ?, ?)
//       `;
//     await db.query(nowcastQuery, [NOWCASTStatus.TN, NOWCASTStatus.RJ, NOWCASTStatus.MP, NOWCASTStatus.MH]);

//     // Insert TN Weather Analysis data
//     const tnWeatherQuery = `
//           INSERT INTO shiftC_commonworks (operation, TN, RJ, MP, MH) 
//           VALUES ('TN Weather Analysis', ?, 'N/A', 'N/A', 'N/A')
//       `;
//     await db.query(tnWeatherQuery, [TNWeatherAnalysis]);

//     // console.log("All data inserted successfully");
//     return res.status(200).send("Data inserted successfully");
//   } catch (error) {
//     console.error("Error during data insertion:", error);
//     return res.status(500).send("Error inserting data");
//   }
// });
// app.get("/shiftC_commonworkslast", async (req, res) => {
//   try {
//     const [rows] = await db.query("SELECT * FROM shiftC_commonworks ORDER BY created_at DESC LIMIT 3");
//     return res.status(200).json(rows);
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     return res.status(500).send("Error fetching data");
//   }
// });
app.post("/shiftC_commonworks", async (req, res) => {
  const { ZYGRIB, NOWCASTStatus, TNWeatherAnalysis } = req.body;

  try {
    // Insert ZYGRIB data
    const zygribQuery = `
          INSERT INTO shiftC_commonworks (operation, TN, RJ, MP, MH) 
          VALUES ('ZYGRIB', ?, ?, ?, ?)
      `;
    await db.query(zygribQuery, [ZYGRIB.TN, ZYGRIB.RJ, ZYGRIB.MP, ZYGRIB.MH]);

    // Insert NOWCAST data
    const nowcastQuery = `
          INSERT INTO shiftC_commonworks (operation, TN, RJ, MP, MH) 
          VALUES ('NOWCAST', ?, ?, ?, ?)
      `;
    await db.query(nowcastQuery, [NOWCASTStatus.TN, NOWCASTStatus.RJ, NOWCASTStatus.MP, NOWCASTStatus.MH]);

    // Insert TN Weather Analysis data
    const tnWeatherQuery = `
          INSERT INTO shiftC_commonworks (operation, TN, RJ, MP, MH) 
          VALUES ('TN Weather Analysis', ?, 'N/A', 'N/A', 'N/A')
      `;
    await db.query(tnWeatherQuery, [TNWeatherAnalysis]);

    // console.log("All data inserted successfully");
    return res.status(200).send("Data inserted successfully");
  } catch (error) {
    console.error("Error during data insertion:", error);
    return res.status(500).send("Error inserting data");
  }
});
app.get("/shiftC_commonworkslast", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM shiftC_commonworks ORDER BY created_at DESC LIMIT 3");
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).send("Error fetching data");
  }
});


app.post('/shiftC_remarks', async (req, res) => {
  const { work_description, work_status } = req.body;

  const query = 'INSERT INTO shiftC_remarks (work_description, work_status) VALUES (?, ?)';

  try {
    // Use await to handle the db.query
    const results = await db.query(query, [work_description, work_status]);

    // Sending a success response with 200 status code
    return res.status(200).json({ message: 'Data saved successfully', id: results.insertId });
  } catch (error) {
    console.error('Error during data insertion:', error);
    return res.status(500).send('Error saving data'); // Send an error response
  }
});
app.get("/shiftC_remarkslast", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM shiftC_remarks ORDER BY created_at DESC LIMIT 1");
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).send("Error fetching data");
  }
});
/////   Shift_C  Ends    /////

// Start the server



// Serve React frontend in production (if you need to host both on the same server)




app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});