# Crypto Transaction Reconciler

A production-grade Node.js backend application designed to reconcile cryptocurrency transactions between internal user records and external exchange statements. 

This project completely fulfills all four tasks of the assignment: **Data Ingestion & Validation**, **Reconciliation Engine**, **Reporting**, and **REST API Exposure**.

##  Features

* **Task 1: Robust Data Ingestion**
    * Uses efficient stream-based parsing (`csv-parser`) to handle potentially large CSV files without memory bloat.
    * Dedicated `validator.js` layer identifies missing fields, malformed timestamps, negative quantities, and duplicate `transaction_id`s before they touch the database.
* **Task 2: Configurable Matching Engine**
    * Matches transactions based on Asset, Type (handling `TRANSFER_IN`/`TRANSFER_OUT` perspectives), Time, and Quantity.
    * Tolerances are strictly configurable via `.env` variables (Default: 5-minute time window, 0.01% quantity tolerance).
* **Task 3: Comprehensive Reporting**
    * Categorizes every transaction into: `matched`, `conflicting` (with specific reasons), `unmatched_user`, and `unmatched_exchange`.
    * Persists reports to MongoDB to maintain historical records of each reconciliation run.
    * Bonus: Exports the final generated report back into a clean CSV format.
* **Task 4: RESTful API**
    * Built with Express.js to expose clean, decoupled endpoints for triggering runs and fetching summarized or detailed data.

##  Prerequisites

Before running this application, ensure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **MongoDB** (Running locally on the default port `27017`)

##  Project Structure

\`\`\`text
crypto-reconciler/
├── data/
│   ├── user_transactions.csv
│   └── exchange_transactions.csv
├── src/
│   ├── config/
│   │   └── index.js           # Environment variable configuration
│   ├── ingestion/
│   │   ├── parser.js          # CSV streaming and database insertion
│   │   └── validator.js       # Data hygiene and rule checking
│   ├── matching/
│   │   └── engine.js          # Core reconciliation algorithms
│   ├── models/
│   │   ├── Transaction.js     # Mongoose schema for raw data
│   │   └── Report.js          # Mongoose schema for match results
│   ├── routes/
│   │   └── api.js             # Express REST endpoints
│   └── app.js                 # Application entry point
├── package.json
└── .env
\`\`\`

##  Setup & Installation

**1. Install dependencies**
\`\`\`bash
npm install
\`\`\`

**2. Configure Environment Variables**
Create a `.env` file in the root directory (next to `package.json`) and add the following configuration:
\`\`\`env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/crypto-reconciler
TIMESTAMP_TOLERANCE_SECONDS=300
QUANTITY_TOLERANCE_PCT=0.01
\`\`\`

**3. Add your Data Files**
Ensure your assignment CSV files are placed exactly in the `data/` folder at the root of the project:
- `data/user_transactions.csv`
- `data/exchange_transactions.csv`

**4. Start the Server**
\`\`\`bash
npm start
\`\`\`
The server will start and connect to your local database. It will output: `http://localhost:3000`

---

##  API Endpoints

You can use **Postman**, **cURL**, or your **Web Browser** to interact with the API.

### 1. Trigger Reconciliation Run (POST)
**Endpoint:** `POST /reconcile`
Ingests the CSVs, runs the matching engine, saves the data to MongoDB, and returns a unique `runId`.
\`\`\`bash
curl -X POST http://localhost:3000/reconcile
\`\`\`
*(Optional: Pass a JSON body to override tolerances for a specific run, e.g., `{"timestampToleranceSeconds": 600}`)*

### 2. Get Reconciliation Summary (GET)
**Endpoint:** `GET /report/:runId/summary`
Returns the exact counts of matched, conflicting, and unmatched transactions.

### 3. Get Unmatched Transactions (GET)
**Endpoint:** `GET /report/:runId/unmatched`
Returns only the transactions that failed to match, including the strict `reason` for the failure.

### 4. Get Full JSON Report (GET)
**Endpoint:** `GET /report/:runId`
Returns the complete, massive JSON array containing all categorizations and raw transaction objects.

### 5. Download CSV Report (GET) - *Task 3 Requirement*
**Endpoint:** `GET /report/:runId/csv`
Converts the JSON report into a structured CSV file and triggers an automatic browser download. *Best tested by pasting this URL directly into your web browser.*

---

## Architectural Decisions & Scalability

1. **Separation of Concerns:** Routing (`api.js`), business logic (`engine.js`), and database modeling (`models/`) are completely decoupled. This makes testing and future expansion significantly easier.
2. **Stateless Runs:** Every time the `/reconcile` endpoint is hit, a new `UUID` is generated. All database rows are tagged with this ID, allowing multiple reconciliation batches to exist safely in the same database without collision.
3. **Graceful Error Handling:** If a row is corrupted in the CSV (e.g., negative quantity, malformed text), the `validator.js` catches it, flags `isValid: false`, attaches the issue, and allows the ingestion stream to continue uninterrupted rather than crashing the server.