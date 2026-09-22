import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [page, setPage] = useState("Dashboard");

  const [simulationResult, setSimulationResult] = useState({
    algorithm: "Round Robin",
    totalRequests: 0,
    distribution: [0, 0, 0],
    rejected: 0,
  });

  return (
    <div className="app">

      {/* ================= SIDEBAR ================= */}

      <aside className="sidebar">

        <h2>☁ Cloud LB</h2>

        <button onClick={() => setPage("Dashboard")}>
          📊 Dashboard
        </button>

        <button onClick={() => setPage("Servers")}>
          🖥️ Servers
        </button>

        <button onClick={() => setPage("Simulation")}>
          ⚙️ Simulation
        </button>

        <button onClick={() => setPage("Results")}>
          📈 Results
        </button>

      </aside>


      {/* ================= MAIN ================= */}

      <main className="main">

        <header>
          <h1>Cloud Load Balancing Simulator</h1>
          <p>Distributed Computing Project</p>
        </header>


        {page === "Dashboard" && (
          <Dashboard result={simulationResult} />
        )}


        {page === "Servers" && (
          <Servers />
        )}


        {page === "Simulation" && (
          <Simulation
            setSimulationResult={setSimulationResult}
            goToResults={() => setPage("Results")}
          />
        )}


        {page === "Results" && (
          <Results result={simulationResult} />
        )}

      </main>

    </div>
  );
}


/* =====================================================
   DASHBOARD
===================================================== */

function Dashboard({ result }) {

  const total = result.totalRequests;

  const s1 = result.distribution[0];
  const s2 = result.distribution[1];
  const s3 = result.distribution[2];

  const accepted = s1 + s2 + s3;

  const averageLoad =
    total > 0
      ? Math.round((accepted / total) * 100)
      : 0;

  return (
    <>

      {/* SUMMARY CARDS */}

      <div className="cards">

        <div className="card">
          <h3>Total Servers</h3>
          <strong>3</strong>
        </div>

        <div className="card">
          <h3>Total Requests</h3>
          <strong>{total}</strong>
        </div>

        <div className="card">
          <h3>Average Load</h3>
          <strong>{averageLoad}%</strong>
        </div>

        <div className="card">
          <h3>Response Time</h3>
          <strong>120 ms</strong>
        </div>

      </div>


      {/* SERVER STATUS */}

      <section className="section">

        <h2>Server Status</h2>

        <div className="servers">

          <Server
            name="Server 1"
            load={total > 0 ? Math.round((s1 / total) * 100) : 0}
            requests={s1}
          />

          <Server
            name="Server 2"
            load={total > 0 ? Math.round((s2 / total) * 100) : 0}
            requests={s2}
          />

          <Server
            name="Server 3"
            load={total > 0 ? Math.round((s3 / total) * 100) : 0}
            requests={s3}
          />

        </div>

      </section>


      {/* DISTRIBUTION */}

      <section className="section">

        <h2>Latest Request Distribution</h2>

        <p>
          🖥️ Server 1 → <b>{s1}</b> requests
        </p>

        <p>
          🖥️ Server 2 → <b>{s2}</b> requests
        </p>

        <p>
          🖥️ Server 3 → <b>{s3}</b> requests
        </p>

        <p>
          ❌ Rejected → <b>{result.rejected}</b>
        </p>

      </section>

    </>
  );
}


/* =====================================================
   SERVER COMPONENT
===================================================== */

function Server({ name, load, requests }) {

  return (
    <div className="server-card">

      <h3>{name}</h3>

      <div className="load">
        {load}%
      </div>

      <div className="load-bar-background">

        <div
          className="load-bar"
          style={{
            width: `${Math.min(load, 100)}%`
          }}
        />

      </div>

      <p>
        🟢 Active
      </p>

      <small>
        {requests} requests
      </small>

    </div>
  );
}


/* =====================================================
   SERVERS PAGE
===================================================== */

function Servers() {

  return (

    <section className="section">

      <h2>Virtual Servers</h2>

      <div className="servers">

        <Server
          name="Server 1"
          load={0}
          requests={0}
        />

        <Server
          name="Server 2"
          load={0}
          requests={0}
        />

        <Server
          name="Server 3"
          load={0}
          requests={0}
        />

      </div>

    </section>

  );
}


/* =====================================================
   SIMULATION
===================================================== */

function Simulation({
  setSimulationResult,
  goToResults
}) {

  const [algorithm, setAlgorithm] =
    useState("Round Robin");

  const [requests, setRequests] =
    useState(10);

  const [capacity, setCapacity] =
    useState(5);

  const [running, setRunning] =
    useState(false);

  const [completed, setCompleted] =
    useState(false);

  const [currentRequest, setCurrentRequest] =
    useState(0);

  const [distribution, setDistribution] =
    useState([0, 0, 0]);

  const [requestSequence, setRequestSequence] =
    useState([]);

  const [rejectedRequests, setRejectedRequests] =
    useState(0);


  /* =================================================
     LIVE SIMULATION
  ================================================= */

  useEffect(() => {

    if (!running) {
      return;
    }


    /* Simulation finished */

    if (
      currentRequest >= Number(requests)
    ) {

      setRunning(false);
      setCompleted(true);

      return;
    }


    const timer = setTimeout(() => {

      let serverIndex = -1;


      /* ==========================================
         ROUND ROBIN
      ========================================== */

      if (algorithm === "Round Robin") {

        for (let i = 0; i < 3; i++) {

          const candidate =
            (currentRequest + i) % 3;

          if (
            distribution[candidate] <
            Number(capacity)
          ) {

            serverIndex = candidate;

            break;
          }
        }
      }


      /* ==========================================
         LEAST CONNECTIONS
      ========================================== */

      else if (
        algorithm === "Least Connections"
      ) {

        let lowestLoad =
          Infinity;


        for (let i = 0; i < 3; i++) {

          if (
            distribution[i] <
              Number(capacity) &&
            distribution[i] <
              lowestLoad
          ) {

            lowestLoad =
              distribution[i];

            serverIndex = i;
          }

        }

      }


      /* ==========================================
         ALL SERVERS FULL
      ========================================== */

      if (serverIndex === -1) {

        setRejectedRequests(
          previous => previous + 1
        );

        setRequestSequence(
          previous => [
            ...previous,
            {
              request:
                currentRequest + 1,
              server:
                "REJECTED"
            }
          ]
        );

        setCurrentRequest(
          previous => previous + 1
        );

        return;
      }


      /* ==========================================
         ACCEPT REQUEST
      ========================================== */

      setDistribution(previous => {

        const updated =
          [...previous];

        updated[serverIndex]++;

        return updated;

      });


      /* ==========================================
         ADD ROUTING LOG
      ========================================== */

      setRequestSequence(
        previous => [
          ...previous,
          {
            request:
              currentRequest + 1,
            server:
              serverIndex + 1
          }
        ]
      );


      /* NEXT REQUEST */

      setCurrentRequest(
        previous => previous + 1
      );


    }, 600);


    return () => clearTimeout(timer);

  }, [
    running,
    currentRequest,
    requests,
    capacity,
    algorithm,
    distribution
  ]);


  /* =================================================
     SAVE RESULT
  ================================================= */

  useEffect(() => {

    if (
      completed &&
      !running
    ) {

      setSimulationResult({

        algorithm:

          algorithm,

        totalRequests:

          Number(requests),

        distribution:

          distribution,

        rejected:

          rejectedRequests

      });

    }

  }, [
    completed,
    running,
    algorithm,
    requests,
    distribution,
    rejectedRequests,
    setSimulationResult
  ]);


  /* =================================================
     START SIMULATION
  ================================================= */

  function startSimulation() {

    const total =
      Number(requests);

    const serverCapacity =
      Number(capacity);


    if (
      !Number.isInteger(total) ||
      total < 1
    ) {

      alert(
        "Enter a valid number of requests."
      );

      return;
    }


    if (
      !Number.isInteger(serverCapacity) ||
      serverCapacity < 1
    ) {

      alert(
        "Enter a valid server capacity."
      );

      return;
    }


    if (total > 100) {

      alert(
        "For demonstration, use 100 or fewer requests."
      );

      return;
    }


    /* RESET */

    setDistribution(
      [0, 0, 0]
    );

    setRequestSequence(
      []
    );

    setRejectedRequests(
      0
    );

    setCurrentRequest(
      0
    );

    setCompleted(
      false
    );

    setRunning(
      true
    );

  }


  /* =================================================
     CURRENT TOTALS
  ================================================= */

  const accepted =
    distribution.reduce(
      (sum, value) =>
        sum + value,
      0
    );


  return (

    <section className="section">

      <h2>
        Load Balancing Simulation
      </h2>

      <p className="description">

        Generate client requests and watch
        the load balancer distribute them
        among virtual servers.

      </p>


      {/* ==========================================
          ALGORITHM
      ========================================== */}

      <label>
        Load Balancing Algorithm
      </label>

      <select
        value={algorithm}
        disabled={running}
        onChange={(e) =>
          setAlgorithm(e.target.value)
        }
      >

        <option value="Round Robin">
          Round Robin
        </option>

        <option value="Least Connections">
          Least Connections
        </option>

      </select>


      {/* ==========================================
          REQUESTS
      ========================================== */}

      <label>
        Number of Requests
      </label>

      <input
        type="number"
        min="1"
        max="100"
        value={requests}
        disabled={running}
        onChange={(e) =>
          setRequests(e.target.value)
        }
      />


      {/* ==========================================
          CAPACITY
      ========================================== */}

      <label>
        Server Capacity
      </label>

      <input
        type="number"
        min="1"
        max="100"
        value={capacity}
        disabled={running}
        onChange={(e) =>
          setCapacity(e.target.value)
        }
      />


      {/* ==========================================
          START BUTTON
      ========================================== */}

      <button
        className="primary-button"
        disabled={running}
        onClick={startSimulation}
      >

        {running
          ? "⏳ Simulation Running..."
          : "▶ Start Simulation"}

      </button>


      {/* ==========================================
          LIVE SIMULATION
      ========================================== */}

      {(running ||
        requestSequence.length > 0) && (

        <div className="live-simulation">

          <h3>
            🔄 Live Request Processing
          </h3>

          <p className="algorithm-info">

            Algorithm:

            {" "}

            <strong>
              {algorithm}
            </strong>

          </p>


          {/* FLOW */}

          <div className="flow">

            <div className="flow-box">
              👤 Client
            </div>

            <div className="arrow">
              →
            </div>

            <div className="flow-box load-balancer">
              ⚖️ Load Balancer
            </div>

            <div className="arrow">
              →
            </div>

            <div className="flow-box">
              🖥️ Servers
            </div>

          </div>


          {/* CURRENT REQUEST */}

          {running && (

            <div className="current-request">

              Processing Request

              {" "}

              <strong>
                R{currentRequest + 1}
              </strong>

            </div>

          )}


          {/* ======================================
              STATS
          ====================================== */}

          <div className="simulation-stats">

            <span>
              Total: {requests}
            </span>

            <span>
              Accepted: {accepted}
            </span>

            <span>
              Rejected: {rejectedRequests}
            </span>

          </div>


          {/* ======================================
              LIVE SERVERS
          ====================================== */}

          <div className="live-servers">

            {[0, 1, 2].map(
              (index) => {

                const load =
                  Number(capacity) > 0
                    ? Math.round(
                        (distribution[index] /
                          Number(capacity)) *
                          100
                      )
                    : 0;


                return (

                  <div
                    className="live-server"
                    key={index}
                  >

                    <h4>
                      Server {index + 1}
                    </h4>


                    <div className="live-load">
                      {Math.min(load, 100)}%
                    </div>


                    <div className="load-bar-background">

                      <div
                        className="load-bar"
                        style={{
                          width:
                            `${Math.min(load, 100)}%`
                        }}
                      />

                    </div>


                    <p>

                      {distribution[index]}

                      {" / "}

                      {capacity}

                      {" requests"}

                    </p>


                    <small>

                      {distribution[index] >=
                        Number(capacity)
                        ? "🔴 Full"
                        : "🟢 Available"}

                    </small>

                  </div>

                );

              }
            )}

          </div>


          {/* ======================================
              REQUEST ROUTING
          ====================================== */}

          <h3>
            Request Routing
          </h3>


          <div className="request-list">

            {requestSequence.map(
              (item) => (

                <span
                  className={
                    item.server === "REJECTED"
                      ? "request rejected"
                      : "request"
                  }
                  key={item.request}
                >

                  R{item.request}

                  {" → "}

                  {item.server === "REJECTED"
                    ? "REJECTED"
                    : `S${item.server}`}

                </span>

              )
            )}

          </div>


          {/* ======================================
              COMPLETED
          ====================================== */}

          {completed && (

            <div className="completed-message">

              ✅ Simulation Completed

              <br />

              {accepted} requests accepted,
              {" "}
              {rejectedRequests} rejected.

              <br />

              <button
                className="primary-button"
                onClick={goToResults}
              >

                📊 View Results

              </button>

            </div>

          )}

        </div>

      )}

    </section>

  );
}


/* =====================================================
   RESULTS PAGE
===================================================== */

function Results({ result }) {

  const total =
    result.totalRequests;

  const s1 =
    result.distribution[0];

  const s2 =
    result.distribution[1];

  const s3 =
    result.distribution[2];


  const maxValue =
    Math.max(
      s1,
      s2,
      s3,
      1
    );


  return (

    <section className="section">

      <h2>
        Simulation Results
      </h2>


      <div className="result-box">

        <p>
          <b>Algorithm:</b>{" "}
          {result.algorithm}
        </p>

        <p>
          <b>Total Requests:</b>{" "}
          {total}
        </p>

        <p>
          <b>Accepted Requests:</b>{" "}
          {s1 + s2 + s3}
        </p>

        <p>
          <b>Rejected Requests:</b>{" "}
          {result.rejected}
        </p>

      </div>


      <h3>
        Request Distribution
      </h3>


      <div className="result-bars">

        <div
          className="bar"
          style={{
            width:
              `${(s1 / maxValue) * 100}%`
          }}
        >

          Server 1 — {s1}

        </div>


        <div
          className="bar"
          style={{
            width:
              `${(s2 / maxValue) * 100}%`
          }}
        >

          Server 2 — {s2}

        </div>


        <div
          className="bar"
          style={{
            width:
              `${(s3 / maxValue) * 100}%`
          }}
        >

          Server 3 — {s3}

        </div>

      </div>

    </section>

  );
}


export default App;