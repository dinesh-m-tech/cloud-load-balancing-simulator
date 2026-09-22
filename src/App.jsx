import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import "./App.css";

const SERVER_COUNT = 3;

function App() {
  const [page, setPage] = useState("Dashboard");

  const [simulationResult, setSimulationResult] = useState({
    algorithm: "Round Robin",
    totalRequests: 0,
    distribution: [0, 0, 0],
    rejected: 0,
    rerouted: 0,
    failedServers: [],
    capacity: 5,
    successRate: 0,
    responseTime: 100,
    averageLoad: 0,
  });

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response = await fetch(
        "http://127.0.0.1:5000/api/simulation-history"
      );

      if (!response.ok) {
        throw new Error("Failed to load simulation history");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setHistory(data);
      } else {
        throw new Error("Invalid history response");
      }
    } catch (error) {
      console.error("History loading error:", error);
      setHistoryError("Could not load MySQL history. Make sure Flask is running.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
        <button onClick={() => setPage("Compare")}>
  ⚖️ Compare
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
          <Servers result={simulationResult} />
        )}

        {page === "Simulation" && (
          <Simulation
            setSimulationResult={setSimulationResult}
            goToResults={() => setPage("Results")}
            onHistoryUpdate={loadHistory}
          />
        )}

        {page === "Results" && (
          <Results
            result={simulationResult}
            history={history}
            historyLoading={historyLoading}
            historyError={historyError}
            refreshHistory={loadHistory}
          />
        )}
        {page === "Compare" && (
  <Comparison result={simulationResult} />
)}
      </main>
    </div>
  );
}

/* =====================================================
   DASHBOARD
===================================================== */

function Dashboard({ result }) {
  const [s1, s2, s3] = result.distribution;

  const activeServers =
    SERVER_COUNT - result.failedServers.length;

  const averageLoad =
    activeServers > 0 && result.capacity > 0
      ? Math.round(
          ((s1 + s2 + s3) /
            (activeServers * result.capacity)) *
            100
        )
      : 0;

  return (
    <>
      <div className="cards">
        <div className="card">
          <h3>Total Servers</h3>
          <strong>{SERVER_COUNT}</strong>
        </div>

        <div className="card">
          <h3>Total Requests</h3>
          <strong>{result.totalRequests}</strong>
        </div>

        <div className="card">
          <h3>Average Load</h3>
          <strong>{Math.min(averageLoad, 100)}%</strong>
        </div>

        <div className="card">
          <h3>Rerouted</h3>
          <strong>{result.rerouted}</strong>
        </div>
      </div>

      <section className="section">
        <h2>Server Status</h2>

        <div className="servers">
          {[0, 1, 2].map((index) => {
            const failed =
              result.failedServers.includes(index);

            const load =
              result.capacity > 0
                ? Math.round(
                    (result.distribution[index] /
                      result.capacity) *
                      100
                  )
                : 0;

            return (
              <Server
                key={index}
                name={`Server ${index + 1}`}
                load={failed ? 0 : load}
                requests={result.distribution[index]}
                capacity={result.capacity}
                failed={failed}
              />
            );
          })}
        </div>
      </section>

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
          🔄 Rerouted → <b>{result.rerouted}</b>
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

function Server({
  name,
  load,
  requests,
  capacity,
  failed = false,
}) {
  const safeLoad = Math.min(Math.max(load, 0), 100);

  return (
    <div className="server-card">
      <h3>{name}</h3>

      {failed ? (
        <>
          <div className="load">OFF</div>

          <div className="load-bar-background">
            <div
              className="load-bar"
              style={{ width: "0%" }}
            />
          </div>

          <p>🔴 Failed</p>

          <small>Server Failed</small>
        </>
      ) : (
        <>
          <div className="load">{safeLoad}%</div>

          <div className="load-bar-background">
            <div
              className="load-bar"
              style={{
                width: `${safeLoad}%`,
              }}
            />
          </div>

          <p>
            {requests >= capacity
              ? "🔴 Full"
              : "🟢 Active"}
          </p>

          <small>
            {requests} / {capacity} requests
          </small>
        </>
      )}
    </div>
  );
}

/* =====================================================
   SERVERS PAGE
===================================================== */

function Servers({ result }) {
  return (
    <section className="section">
      <h2>Virtual Servers</h2>

      <div className="servers">
        {[0, 1, 2].map((index) => {
          const failed =
            result.failedServers.includes(index);

          const load =
            result.capacity > 0
              ? Math.round(
                  (result.distribution[index] /
                    result.capacity) *
                    100
                )
              : 0;

          return (
            <Server
              key={index}
              name={`Server ${index + 1}`}
              load={failed ? 0 : load}
              requests={result.distribution[index]}
              capacity={result.capacity}
              failed={failed}
            />
          );
        })}
      </div>

      {result.failedServers.length > 0 && (
        <div className="result-box">
          <h3>⚠️ Server Failure Information</h3>

          <p>
            Failed Servers:{" "}
            <b>
              {result.failedServers
                .map(
                  (server) =>
                    `Server ${server + 1}`
                )
                .join(", ")}
            </b>
          </p>

          <p>
            🔄 Rerouted Requests:{" "}
            <b>{result.rerouted}</b>
          </p>

          <p>
            ❌ Rejected Requests:{" "}
            <b>{result.rejected}</b>
          </p>
        </div>
      )}
    </section>
  );
}

/* =====================================================
   SIMULATION
===================================================== */

function Simulation({
  setSimulationResult,
  goToResults,
  onHistoryUpdate,
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

  const [reroutedRequests, setReroutedRequests] =
    useState(0);

  /*
    false = active
    true = failed
  */

  const [failedServers, setFailedServers] =
    useState([false, false, false]);

  /* =================================================
     SERVER FAILURE
  ================================================= */

  function toggleServerFailure(index) {
    if (running) return;

    setFailedServers((previous) => {
      const updated = [...previous];

      updated[index] = !updated[index];

      return updated;
    });
  }

  /* =================================================
     LIVE SIMULATION
  ================================================= */

  useEffect(() => {
    if (!running) return;

    if (currentRequest >= Number(requests)) {
      setRunning(false);
      setCompleted(true);
      return;
    }

    const timer = setTimeout(() => {
      const totalCapacity = Number(capacity);

      let originalServer = -1;
      let serverIndex = -1;

      /* FIND ORIGINAL SERVER */

      if (algorithm === "Round Robin") {
        originalServer =
          currentRequest % SERVER_COUNT;
      } else if (
        algorithm === "Least Connections"
      ) {
        let lowestLoad = Infinity;

        for (let i = 0; i < SERVER_COUNT; i++) {
          if (failedServers[i]) continue;

          if (
            distribution[i] <
              totalCapacity &&
            distribution[i] < lowestLoad
          ) {
            lowestLoad = distribution[i];
            originalServer = i;
          }
        }
      }

      /* TRY ORIGINAL SERVER */

      if (
        originalServer !== -1 &&
        !failedServers[originalServer] &&
        distribution[originalServer] <
          totalCapacity
      ) {
        serverIndex = originalServer;
      }

      /* REROUTING */

      if (serverIndex === -1) {
        const availableServers = [];

        for (let i = 0; i < SERVER_COUNT; i++) {
          if (
            !failedServers[i] &&
            distribution[i] < totalCapacity
          ) {
            availableServers.push(i);
          }
        }

        /* ROUND ROBIN REROUTING */

        if (
          algorithm === "Round Robin" &&
          availableServers.length > 0
        ) {
          for (
            let step = 1;
            step <= SERVER_COUNT;
            step++
          ) {
            const candidate =
              (originalServer + step) %
              SERVER_COUNT;

            if (
              availableServers.includes(
                candidate
              )
            ) {
              serverIndex = candidate;
              break;
            }
          }
        }

        /* LEAST CONNECTIONS REROUTING */

        if (
          algorithm ===
            "Least Connections" &&
          availableServers.length > 0
        ) {
          let lowestLoad = Infinity;

          for (const candidate of availableServers) {
            if (
              distribution[candidate] <
              lowestLoad
            ) {
              lowestLoad =
                distribution[candidate];

              serverIndex = candidate;
            }
          }
        }

        /* COUNT REROUTING */

        if (
          serverIndex !== -1 &&
          serverIndex !== originalServer
        ) {
          setReroutedRequests(
            (previous) => previous + 1
          );
        }
      }

      /* REJECT */

      if (serverIndex === -1) {
        setRejectedRequests(
          (previous) => previous + 1
        );

        setRequestSequence((previous) => [
          ...previous,
          {
            request: currentRequest + 1,
            server: "REJECTED",
            rerouted: false,
          },
        ]);

        setCurrentRequest(
          (previous) => previous + 1
        );

        return;
      }

      /* ACCEPT */

      setDistribution((previous) => {
        const updated = [...previous];

        updated[serverIndex]++;

        return updated;
      });

      /* ROUTING LOG */

      const wasRerouted =
        serverIndex !== originalServer;

      setRequestSequence((previous) => [
        ...previous,
        {
          request: currentRequest + 1,
          server: serverIndex + 1,
          rerouted: wasRerouted,
        },
      ]);

      /* NEXT REQUEST */

      setCurrentRequest(
        (previous) => previous + 1
      );
    }, 600);

    return () => clearTimeout(timer);
  }, [
    running,
    currentRequest,
    requests,
    capacity,
    algorithm,
    distribution,
    failedServers,
  ]);

  /* =================================================
     SAVE RESULT
  ================================================= */

  useEffect(() => {
    if (!completed || running) return;

    const total = Number(requests);
    const accepted = distribution.reduce(
      (sum, value) => sum + value,
      0
    );

    const activeServerCount =
      failedServers.filter((failed) => !failed).length;

    const successRate =
      total > 0
        ? Number(((accepted / total) * 100).toFixed(1))
        : 0;

    const averageLoad =
      activeServerCount > 0 && Number(capacity) > 0
        ? Math.min(
            Math.round(
              (accepted /
                (activeServerCount * Number(capacity))) *
                100
            ),
            100
          )
        : 0;

    const responseTime = 100 + reroutedRequests * 10;

    const finalResult = {
      algorithm,
      totalRequests: total,
      distribution: [...distribution],
      rejected: rejectedRequests,
      rerouted: reroutedRequests,
      failedServers: failedServers
        .map((failed, index) => (failed ? index : -1))
        .filter((index) => index !== -1),
      capacity: Number(capacity),
      successRate,
      averageLoad,
      responseTime,
    };

    setSimulationResult(finalResult);

    // Save the completed simulation through Flask -> MySQL.
    async function saveToBackend() {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/api/simulate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              algorithm,
              requests: total,
              capacity: Number(capacity),
              failedServers: finalResult.failedServers,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Simulation API failed"
          );
        }

        // Use the backend's calculated result as the final result.
        setSimulationResult({
          algorithm: data.algorithm,
          totalRequests: data.totalRequests,
          distribution: data.distribution || [0, 0, 0],
          rejected: data.rejected || 0,
          rerouted: data.rerouted || 0,
          failedServers: data.failedServers || [],
          capacity: data.capacity || Number(capacity),
          successRate: data.successRate || 0,
          averageLoad: data.averageLoad || 0,
          responseTime: data.responseTime || 100,
        });

        if (onHistoryUpdate) {
          await onHistoryUpdate();
        }
      } catch (error) {
        console.error("MySQL save error:", error);
        alert(
          "Simulation completed, but the result could not be saved to MySQL. Check that Flask is running."
        );
      }
    }

    saveToBackend();
  }, [
    completed,
    running,
    algorithm,
    requests,
    capacity,
    distribution,
    rejectedRequests,
    reroutedRequests,
    failedServers,
    setSimulationResult,
    onHistoryUpdate,
  ]);

  /* =================================================
     START SIMULATION
  ================================================= */

  function startSimulation() {
    const total = Number(requests);
    const serverCapacity = Number(capacity);

    if (
      !Number.isInteger(total) ||
      total < 1 ||
      total > 100
    ) {
      alert(
        "Enter requests between 1 and 100."
      );
      return;
    }

    if (
      !Number.isInteger(serverCapacity) ||
      serverCapacity < 1 ||
      serverCapacity > 100
    ) {
      alert(
        "Enter server capacity between 1 and 100."
      );
      return;
    }

    const activeServerCount =
      failedServers.filter(
        (failed) => !failed
      ).length;

    if (activeServerCount === 0) {
      alert(
        "At least one server must be active."
      );
      return;
    }

    setDistribution([0, 0, 0]);
    setRequestSequence([]);
    setRejectedRequests(0);
    setReroutedRequests(0);
    setCurrentRequest(0);
    setCompleted(false);
    setRunning(true);
  }

  /* CURRENT TOTALS */

  const accepted =
    distribution.reduce(
      (sum, value) => sum + value,
      0
    );

  return (
    <section className="section">
      <h2>Load Balancing Simulation</h2>

      <p className="description">
        Generate client requests and watch the
        load balancer distribute them among
        virtual servers in real time.
      </p>

      {/* ALGORITHM */}

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

      {/* REQUESTS */}

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

      {/* CAPACITY */}

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

      {/* SERVER FAILURE */}

      <h3>
        ⚠️ Server Failure Simulation
      </h3>

      <p>
        Select a server to simulate failure.
      </p>

      <div className="servers">
        {[0, 1, 2].map((index) => (
          <button
            key={index}
            type="button"
            disabled={running}
            onClick={() =>
              toggleServerFailure(index)
            }
            style={{
              padding: "15px",
              margin: "5px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              cursor: running
                ? "not-allowed"
                : "pointer",
            }}
          >
            {failedServers[index]
              ? `🔴 Server ${
                  index + 1
                } FAILED`
              : `🟢 Server ${
                  index + 1
                } ACTIVE`}
          </button>
        ))}
      </div>

      {/* START */}

      <button
        className="primary-button"
        disabled={running}
        onClick={startSimulation}
      >
        {running
          ? "⏳ Simulation Running..."
          : "▶ Start Simulation"}
      </button>

      {/* LIVE SIMULATION */}

      {(running ||
        requestSequence.length > 0) && (
        <div className="live-simulation">
          <h3>
            🔄 Live Request Processing
          </h3>

          <p className="algorithm-info">
            Algorithm:{" "}
            <strong>{algorithm}</strong>
          </p>

          {/* FLOW */}

          <div className="flow">
            <div className="flow-box">
              👤 Client
            </div>

            <div className="arrow">→</div>

            <div className="flow-box load-balancer">
              ⚖️ Load Balancer
            </div>

            <div className="arrow">→</div>

            <div className="flow-box">
              🖥️ Servers
            </div>
          </div>

          {/* CURRENT REQUEST */}

          {running && (
            <div className="current-request">
              Processing Request{" "}
              <strong>
                R{currentRequest + 1}
              </strong>
            </div>
          )}

          {/* STATS */}

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

            <span>
              Rerouted: {reroutedRequests}
            </span>
          </div>

          {/* LIVE SERVERS */}

          <div className="live-servers">
            {[0, 1, 2].map((index) => {
              const failed =
                failedServers[index];

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

                  {failed ? (
                    <>
                      <div className="live-load">
                        OFF
                      </div>

                      <div className="load-bar-background">
                        <div
                          className="load-bar"
                          style={{
                            width: "0%",
                          }}
                        />
                      </div>

                      <p>
                        Server Failed
                      </p>

                      <small>
                        🔴 Failed
                      </small>
                    </>
                  ) : (
                    <>
                      <div className="live-load">
                        {Math.min(
                          load,
                          100
                        )}
                        %
                      </div>

                      <div className="load-bar-background">
                        <div
                          className="load-bar"
                          style={{
                            width: `${Math.min(
                              load,
                              100
                            )}%`,
                          }}
                        />
                      </div>

                      <p>
                        {distribution[index]} /{" "}
                        {capacity} requests
                      </p>

                      <small>
                        {distribution[index] >=
                        Number(capacity)
                          ? "🔴 Full"
                          : "🟢 Available"}
                      </small>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* REQUEST ROUTING */}

          <h3>Request Routing</h3>

          <div className="request-list">
            {requestSequence.map(
              (item, index) => (
                <span
                  className={
                    item.server === "REJECTED"
                      ? "request rejected"
                      : "request"
                  }
                  key={`${item.request}-${index}`}
                >
                  R{item.request}
                  {" → "}
                  {item.server ===
                  "REJECTED"
                    ? "REJECTED"
                    : `S${item.server}`}
                  {item.rerouted && " 🔄"}
                </span>
              )
            )}
          </div>

          {/* COMPLETED */}

          {completed && (
            <div className="completed-message">
              <h3>
                ✅ Simulation Completed
              </h3>

              <p>
                {accepted} requests accepted
              </p>

              <p>
                {rejectedRequests} requests
                rejected
              </p>

              <p>
                🔄 {reroutedRequests} requests
                rerouted
              </p>

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
   RESULTS PAGE WITH CHARTS
===================================================== */
/* =====================================================
   ALGORITHM COMPARISON ENGINE
===================================================== */

function simulateAlgorithm(
  algorithm,
  requests,
  capacity,
  failedServers
) {
  const distribution = [0, 0, 0];

  let rejected = 0;
  let rerouted = 0;

  for (let request = 0; request < requests; request++) {
    let originalServer = -1;
    let serverIndex = -1;

    /* =========================
       FIND ORIGINAL SERVER
    ========================= */

    if (algorithm === "Round Robin") {
      originalServer =
        request % SERVER_COUNT;
    }

    if (algorithm === "Least Connections") {
      let lowestLoad = Infinity;

      for (let i = 0; i < SERVER_COUNT; i++) {
        if (failedServers.includes(i)) {
          continue;
        }

        if (
          distribution[i] < capacity &&
          distribution[i] < lowestLoad
        ) {
          lowestLoad = distribution[i];
          originalServer = i;
        }
      }
    }

    /* =========================
       CHECK ORIGINAL SERVER
    ========================= */

    if (
      originalServer !== -1 &&
      !failedServers.includes(originalServer) &&
      distribution[originalServer] < capacity
    ) {
      serverIndex = originalServer;
    }

    /* =========================
       FIND ALTERNATIVE SERVER
    ========================= */

    if (serverIndex === -1) {
      const availableServers = [];

      for (let i = 0; i < SERVER_COUNT; i++) {
        if (
          !failedServers.includes(i) &&
          distribution[i] < capacity
        ) {
          availableServers.push(i);
        }
      }

      /* Round Robin rerouting */

      if (
        algorithm === "Round Robin" &&
        availableServers.length > 0
      ) {
        for (
          let step = 1;
          step <= SERVER_COUNT;
          step++
        ) {
          const candidate =
            (originalServer + step) %
            SERVER_COUNT;

          if (
            availableServers.includes(candidate)
          ) {
            serverIndex = candidate;
            break;
          }
        }
      }

      /* Least Connections */

      if (
        algorithm === "Least Connections" &&
        availableServers.length > 0
      ) {
        let lowestLoad = Infinity;

        for (const candidate of availableServers) {
          if (
            distribution[candidate] <
            lowestLoad
          ) {
            lowestLoad =
              distribution[candidate];

            serverIndex = candidate;
          }
        }
      }

      /* Count rerouting */

      if (
        serverIndex !== -1 &&
        serverIndex !== originalServer
      ) {
        rerouted++;
      }
    }

    /* =========================
       REJECT REQUEST
    ========================= */

    if (serverIndex === -1) {
      rejected++;
      continue;
    }

    /* =========================
       ACCEPT REQUEST
    ========================= */

    distribution[serverIndex]++;
  }

  const accepted = distribution.reduce(
    (sum, value) => sum + value,
    0
  );

  const averageLoad =
    capacity > 0
      ? Math.round(
          (accepted /
            ((SERVER_COUNT -
              failedServers.length) *
              capacity)) *
            100
        )
      : 0;

  const successRate =
    requests > 0
      ? ((accepted / requests) * 100).toFixed(1)
      : "0.0";

  /*
    This is the same estimated response-time
    calculation used by the Results page.
  */

  const responseTime =
    100 + rerouted * 10;

  return {
    algorithm,
    accepted,
    rejected,
    rerouted,
    distribution,
    averageLoad: Math.min(
      averageLoad,
      100
    ),
    successRate,
    responseTime,
  };
}

function Results({
  result,
  history,
  historyLoading,
  historyError,
  refreshHistory,
}) {
  const [s1, s2, s3] =
    result.distribution;

  const total = result.totalRequests;

  const accepted =
    s1 + s2 + s3;

  const successRate =
    total > 0
      ? ((accepted / total) * 100).toFixed(
          1
        )
      : "0.0";

  const responseTime =
    100 + result.rerouted * 10;

  /* =================================================
     CHART DATA
  ================================================= */

  /* Request distribution */

  const distributionData = [
    {
      server: "Server 1",
      requests: s1,
    },
    {
      server: "Server 2",
      requests: s2,
    },
    {
      server: "Server 3",
      requests: s3,
    },
  ];

  /* Server utilization */

  const utilizationData = [
    {
      server: "Server 1",
      utilization:
        result.capacity > 0
          ? Math.min(
              Math.round(
                (s1 / result.capacity) *
                  100
              ),
              100
            )
          : 0,
    },
    {
      server: "Server 2",
      utilization:
        result.capacity > 0
          ? Math.min(
              Math.round(
                (s2 / result.capacity) *
                  100
              ),
              100
            )
          : 0,
    },
    {
      server: "Server 3",
      utilization:
        result.capacity > 0
          ? Math.min(
              Math.round(
                (s3 / result.capacity) *
                  100
              ),
              100
            )
          : 0,
    },
  ];

  /* Accepted / rejected */

  const statusData = [
    {
      name: "Accepted",
      value: accepted,
    },
    {
      name: "Rejected",
      value: result.rejected,
    },
  ];

  /*
    Chart colors.
    These are only used by Recharts.
  */

  const PIE_COLORS = [
    "#22c55e",
    "#ef4444",
  ];

  return (
    <section className="section">
      <h2>📊 Simulation Results</h2>

      {/* =================================================
          SUMMARY
      ================================================= */}

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
          {accepted}
        </p>

        <p>
          <b>Rejected Requests:</b>{" "}
          {result.rejected}
        </p>

        <p>
          <b>Rerouted Requests:</b>{" "}
          {result.rerouted}
        </p>

        <p>
          <b>Success Rate:</b>{" "}
          {successRate}%
        </p>

        <p>
          <b>Server Capacity:</b>{" "}
          {result.capacity} requests/server
        </p>

        <p>
          <b>Estimated Response Time:</b>{" "}
          {responseTime} ms
        </p>

        {result.failedServers.length >
          0 && (
          <p>
            <b>Failed Servers:</b>{" "}
            {result.failedServers
              .map(
                (server) =>
                  `Server ${server + 1}`
              )
              .join(", ")}
          </p>
        )}
      </div>

      {/* =================================================
          CHART 1 - REQUEST DISTRIBUTION
      ================================================= */}

      <div className="chart-section">
        <h3>
          📊 Request Distribution
        </h3>

        <p>
          Number of requests handled by
          each virtual server.
        </p>

        <div
          style={{
            width: "100%",
            height: "350px",
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={distributionData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="server" />

              <YAxis allowDecimals={false} />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="requests"
                name="Requests"
                fill="#3b82f6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =================================================
          CHART 2 - SERVER UTILIZATION
      ================================================= */}

      <div className="chart-section">
        <h3>
          📈 Server Utilization
        </h3>

        <p>
          Percentage of capacity used by
          each server.
        </p>

        <div
          style={{
            width: "100%",
            height: "350px",
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={utilizationData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="server" />

              <YAxis
                domain={[0, 100]}
                unit="%"
              />

              <Tooltip
                formatter={(value) => [
                  `${value}%`,
                  "Utilization",
                ]}
              />

              <Legend />

              <Bar
                dataKey="utilization"
                name="Utilization"
                fill="#8b5cf6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =================================================
          CHART 3 - ACCEPTED VS REJECTED
      ================================================= */}

      <div className="chart-section">
        <h3>
          🥧 Request Status
        </h3>

        <p>
          Accepted and rejected request
          distribution.
        </p>

        <div
          style={{
            width: "100%",
            height: "350px",
          }}
        >
          {total > 0 ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label
                >
                  {statusData.map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          PIE_COLORS[index]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                textAlign: "center",
                paddingTop: "120px",
              }}
            >
              No simulation data yet.
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          FINAL STATUS
      ================================================= */}

      <div className="completed-message">
        <h3>
          📊 Final Simulation Status
        </h3>

        <p>
          Server 1:{" "}
          <b>
            {s1} / {result.capacity}
          </b>

          {result.failedServers.includes(
            0
          ) && (
            <span> 🔴 Failed</span>
          )}
        </p>

        <p>
          Server 2:{" "}
          <b>
            {s2} / {result.capacity}
          </b>

          {result.failedServers.includes(
            1
          ) && (
            <span> 🔴 Failed</span>
          )}
        </p>

        <p>
          Server 3:{" "}
          <b>
            {s3} / {result.capacity}
          </b>

          {result.failedServers.includes(
            2
          ) && (
            <span> 🔴 Failed</span>
          )}
        </p>

        <p>
          Accepted:{" "}
          <b>{accepted}</b>
        </p>

        <p>
          Rejected:{" "}
          <b>{result.rejected}</b>
        </p>

        <p>
          🔄 Rerouted:{" "}
          <b>{result.rerouted}</b>
        </p>

        <p>
          📈 Success Rate:{" "}
          <b>{successRate}%</b>
        </p>

        <p>
          ⏱️ Estimated Response Time:{" "}
          <b>{responseTime} ms</b>
        </p>

        {result.failedServers.length >
          0 && (
          <p>
            🔴 Failed Servers:{" "}
            <b>
              {result.failedServers
                .map(
                  (server) =>
                    `S${server + 1}`
                )
                .join(", ")}
            </b>
          </p>
        )}
      </div>


      {/* =================================================
          MYSQL SIMULATION HISTORY
      ================================================= */}

      <div className="section" style={{ marginTop: "25px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <h3>🗄️ MySQL Simulation History</h3>

          <button
            className="primary-button"
            type="button"
            onClick={refreshHistory}
            disabled={historyLoading}
          >
            {historyLoading ? "⏳ Loading..." : "🔄 Refresh History"}
          </button>
        </div>

        {historyError && (
          <p style={{ color: "crimson" }}>
            {historyError}
          </p>
        )}

        {!historyLoading && !historyError && history.length === 0 && (
          <p>No saved simulations yet.</p>
        )}

        {history.length > 0 && (
          <div style={{ overflowX: "auto", marginTop: "15px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "900px",
              }}
            >
              <thead>
                <tr>
                  {[
                    "ID",
                    "Algorithm",
                    "Requests",
                    "Accepted",
                    "Rejected",
                    "Rerouted",
                    "Load",
                    "Success",
                    "Response",
                    "Failed",
                    "Created",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "10px",
                        border: "1px solid #ddd",
                        background: "#f3f4f6",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td style={tableCellStyle}>{item.id}</td>
                    <td style={tableCellStyle}>{item.algorithm}</td>
                    <td style={tableCellStyle}>{item.total_requests}</td>
                    <td style={tableCellStyle}>{item.accepted_requests}</td>
                    <td style={tableCellStyle}>{item.rejected_requests}</td>
                    <td style={tableCellStyle}>{item.rerouted_requests}</td>
                    <td style={tableCellStyle}>{item.average_load}%</td>
                    <td style={tableCellStyle}>{item.success_rate}%</td>
                    <td style={tableCellStyle}>{item.response_time} ms</td>
                    <td style={tableCellStyle}>{item.failed_servers || "None"}</td>
                    <td style={tableCellStyle}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
/* =====================================================
   ALGORITHM COMPARISON PAGE
===================================================== */

function Comparison({ result }) {
  const requests = result.totalRequests;

  const capacity = result.capacity;

  const failedServers =
    result.failedServers;

  const roundRobin = simulateAlgorithm(
    "Round Robin",
    requests,
    capacity,
    failedServers
  );

  const leastConnections =
    simulateAlgorithm(
      "Least Connections",
      requests,
      capacity,
      failedServers
    );

  /* =========================
     GRAPH DATA
  ========================= */

  const comparisonData = [
    {
      metric: "Accepted",
      "Round Robin": roundRobin.accepted,
      "Least Connections":
        leastConnections.accepted,
    },
    {
      metric: "Rejected",
      "Round Robin": roundRobin.rejected,
      "Least Connections":
        leastConnections.rejected,
    },
    {
      metric: "Rerouted",
      "Round Robin": roundRobin.rerouted,
      "Least Connections":
        leastConnections.rerouted,
    },
  ];

  const loadData = [
    {
      metric: "Average Load %",
      "Round Robin":
        roundRobin.averageLoad,
      "Least Connections":
        leastConnections.averageLoad,
    },
    {
      metric: "Success Rate %",
      "Round Robin":
        Number(roundRobin.successRate),
      "Least Connections":
        Number(
          leastConnections.successRate
        ),
    },
  ];

  return (
    <section className="section">
      <h2>⚖️ Algorithm Comparison</h2>

      <p className="description">
        Compare Round Robin and Least
        Connections using the same simulation
        conditions.
      </p>

      {/* =========================
          TEST CONDITIONS
      ========================= */}

      <div className="result-box">
        <h3>🔧 Test Conditions</h3>

        <p>
          <b>Total Requests:</b>{" "}
          {requests}
        </p>

        <p>
          <b>Server Capacity:</b>{" "}
          {capacity} requests/server
        </p>

        <p>
          <b>Failed Servers:</b>{" "}
          {failedServers.length === 0
            ? "None"
            : failedServers
                .map(
                  (server) =>
                    `Server ${server + 1}`
                )
                .join(", ")}
        </p>
      </div>

      {/* =========================
          COMPARISON TABLE
      ========================= */}

      <h3>📋 Comparison Table</h3>

      <div
        style={{
          overflowX: "auto",
          marginTop: "15px",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "center",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: "12px",
                  border: "1px solid #ddd",
                }}
              >
                Metric
              </th>

              <th
                style={{
                  padding: "12px",
                  border: "1px solid #ddd",
                }}
              >
                🔵 Round Robin
              </th>

              <th
                style={{
                  padding: "12px",
                  border: "1px solid #ddd",
                }}
              >
                🟣 Least Connections
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td style={tableCellStyle}>
                Accepted Requests
              </td>

              <td style={tableCellStyle}>
                {roundRobin.accepted}
              </td>

              <td style={tableCellStyle}>
                {leastConnections.accepted}
              </td>
            </tr>

            <tr>
              <td style={tableCellStyle}>
                Rejected Requests
              </td>

              <td style={tableCellStyle}>
                {roundRobin.rejected}
              </td>

              <td style={tableCellStyle}>
                {leastConnections.rejected}
              </td>
            </tr>

            <tr>
              <td style={tableCellStyle}>
                Rerouted Requests
              </td>

              <td style={tableCellStyle}>
                {roundRobin.rerouted}
              </td>

              <td style={tableCellStyle}>
                {leastConnections.rerouted}
              </td>
            </tr>

            <tr>
              <td style={tableCellStyle}>
                Average Load
              </td>

              <td style={tableCellStyle}>
                {roundRobin.averageLoad}%
              </td>

              <td style={tableCellStyle}>
                {leastConnections.averageLoad}%
              </td>
            </tr>

            <tr>
              <td style={tableCellStyle}>
                Success Rate
              </td>

              <td style={tableCellStyle}>
                {roundRobin.successRate}%
              </td>

              <td style={tableCellStyle}>
                {leastConnections.successRate}%
              </td>
            </tr>

            <tr>
              <td style={tableCellStyle}>
                Estimated Response Time
              </td>

              <td style={tableCellStyle}>
                {roundRobin.responseTime} ms
              </td>

              <td style={tableCellStyle}>
                {leastConnections.responseTime} ms
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* =========================
          CHART 1
      ========================= */}

      <div className="chart-section">
        <h3>
          📊 Accepted / Rejected / Rerouted
        </h3>

        <p>
          Comparison of request handling
          between the two algorithms.
        </p>

        <div
          style={{
            width: "100%",
            height: "350px",
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={comparisonData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis dataKey="metric" />

              <YAxis
                allowDecimals={false}
              />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="Round Robin"
                fill="#3b82f6"
              />

              <Bar
                dataKey="Least Connections"
                fill="#8b5cf6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =========================
          CHART 2
      ========================= */}

      <div className="chart-section">
        <h3>
          📈 Load & Success Rate
        </h3>

        <p>
          Comparison of average server load
          and successful requests.
        </p>

        <div
          style={{
            width: "100%",
            height: "350px",
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={loadData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis dataKey="metric" />

              <YAxis
                domain={[0, 100]}
                unit="%"
              />

              <Tooltip
                formatter={(value) =>
                  `${value}%`
                }
              />

              <Legend />

              <Bar
                dataKey="Round Robin"
                fill="#3b82f6"
              />

              <Bar
                dataKey="Least Connections"
                fill="#8b5cf6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =========================
          ALGORITHM INFORMATION
      ========================= */}

      <div className="completed-message">
        <h3>📚 Algorithm Information</h3>

        <p>
          <b>Round Robin:</b> Requests are
          distributed sequentially across the
          available servers.
        </p>

        <p>
          <b>Least Connections:</b> A request
          is directed toward the available
          server with the lowest current
          number of connections.
        </p>

        <p>
          These results are calculated using
          the same request count, server
          capacity, and failure conditions for
          both algorithms.
        </p>
      </div>
    </section>
  );
}

/* =====================================================
   TABLE STYLE
===================================================== */

const tableCellStyle = {
  padding: "12px",
  border: "1px solid #ddd",
};

export default App;