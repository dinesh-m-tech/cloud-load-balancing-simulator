from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import os

# =====================================================
# FLASK APP
# =====================================================

app = Flask(__name__)
CORS(app)


# =====================================================
# MYSQL DATABASE CONFIGURATION
# =====================================================

DB_CONFIG = {
    "host": os.getenv("MYSQLHOST", "localhost"),
    "port": int(os.getenv("MYSQLPORT", 3306)),
    "user": os.getenv("MYSQLUSER", "root"),
    "password": os.getenv("MYSQLPASSWORD", "root"),
    "database": os.getenv("MYSQLDATABASE", "cloud_load_balancer")
}


def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)
def init_database():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS simulation_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            algorithm VARCHAR(50),
            total_requests INT,
            accepted_requests INT,
            rejected_requests INT,
            rerouted_requests INT,
            average_load FLOAT,
            success_rate FLOAT,
            response_time INT,
            capacity INT,
            failed_servers VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    cursor.close()
    conn.close()


# =====================================================
# DATABASE TEST
# =====================================================

@app.route("/api/db-test", methods=["GET"])
def db_test():

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT DATABASE()")

        database = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return jsonify({
            "status": "success",
            "message": "Flask connected to MySQL successfully",
            "database": database
        })

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =====================================================
# CONSTANTS
# =====================================================

SERVER_COUNT = 3


# =====================================================
# ROUND ROBIN
# =====================================================

def round_robin(requests_count, capacity, failed_servers):

    distribution = [0, 0, 0]

    accepted = 0
    rejected = 0
    rerouted = 0

    for request_number in range(requests_count):

        original_server = request_number % SERVER_COUNT

        server_index = -1

        # -------------------------------------------------
        # Try original server
        # -------------------------------------------------

        if (
            original_server not in failed_servers
            and distribution[original_server] < capacity
        ):

            server_index = original_server

        # -------------------------------------------------
        # Reroute request
        # -------------------------------------------------

        if server_index == -1:

            for step in range(1, SERVER_COUNT + 1):

                candidate = (
                    original_server + step
                ) % SERVER_COUNT

                if (
                    candidate not in failed_servers
                    and distribution[candidate] < capacity
                ):

                    server_index = candidate

                    if candidate != original_server:
                        rerouted += 1

                    break

        # -------------------------------------------------
        # Reject request
        # -------------------------------------------------

        if server_index == -1:

            rejected += 1
            continue

        # -------------------------------------------------
        # Accept request
        # -------------------------------------------------

        distribution[server_index] += 1
        accepted += 1

    return {
        "algorithm": "Round Robin",
        "distribution": distribution,
        "accepted": accepted,
        "rejected": rejected,
        "rerouted": rerouted
    }


# =====================================================
# LEAST CONNECTIONS
# =====================================================

def least_connections(
    requests_count,
    capacity,
    failed_servers
):

    distribution = [0, 0, 0]

    accepted = 0
    rejected = 0
    rerouted = 0

    for _ in range(requests_count):

        server_index = -1

        lowest_load = float("inf")

        # -------------------------------------------------
        # Find active server with lowest connections
        # -------------------------------------------------

        for server in range(SERVER_COUNT):

            if server in failed_servers:
                continue

            if distribution[server] >= capacity:
                continue

            if distribution[server] < lowest_load:

                lowest_load = distribution[server]
                server_index = server

        # -------------------------------------------------
        # Reject if no server available
        # -------------------------------------------------

        if server_index == -1:

            rejected += 1
            continue

        # -------------------------------------------------
        # Accept request
        # -------------------------------------------------

        distribution[server_index] += 1
        accepted += 1

    return {
        "algorithm": "Least Connections",
        "distribution": distribution,
        "accepted": accepted,
        "rejected": rejected,
        "rerouted": rerouted
    }


# =====================================================
# SAVE SIMULATION RESULT TO MYSQL
# =====================================================

def save_simulation_result(
    algorithm,
    total_requests,
    accepted_requests,
    rejected_requests,
    rerouted_requests,
    average_load,
    success_rate,
    response_time,
    capacity,
    failed_servers
):

    conn = get_db_connection()

    cursor = conn.cursor()

    sql = """
        INSERT INTO simulation_history
        (
            algorithm,
            total_requests,
            accepted_requests,
            rejected_requests,
            rerouted_requests,
            average_load,
            success_rate,
            response_time,
            capacity,
            failed_servers
        )
        VALUES
        (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
        )
    """

    values = (
        algorithm,
        total_requests,
        accepted_requests,
        rejected_requests,
        rerouted_requests,
        average_load,
        success_rate,
        response_time,
        capacity,
        failed_servers
    )

    cursor.execute(sql, values)

    conn.commit()

    cursor.close()
    conn.close()


# =====================================================
# SIMULATION API
# =====================================================

@app.route("/api/simulate", methods=["POST"])
def simulate():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No data received"
            }), 400

        # -------------------------------------------------
        # Get values from React
        # -------------------------------------------------

        algorithm = data.get(
            "algorithm",
            "Round Robin"
        )

        requests_count = int(
            data.get("requests", 10)
        )

        capacity = int(
            data.get("capacity", 5)
        )

        failed_servers = data.get(
            "failedServers",
            []
        )

        # -------------------------------------------------
        # Make sure failed server values are integers
        # -------------------------------------------------

        failed_servers = [
            int(server)
            for server in failed_servers
        ]

        # -------------------------------------------------
        # Validate requests
        # -------------------------------------------------

        if requests_count < 1:

            return jsonify({
                "error": "Requests must be at least 1"
            }), 400

        if requests_count > 100:

            return jsonify({
                "error": "Requests cannot exceed 100"
            }), 400

        # -------------------------------------------------
        # Validate capacity
        # -------------------------------------------------

        if capacity < 1:

            return jsonify({
                "error": "Capacity must be at least 1"
            }), 400

        if capacity > 100:

            return jsonify({
                "error": "Capacity cannot exceed 100"
            }), 400

        # -------------------------------------------------
        # Remove duplicate failed servers
        # -------------------------------------------------

        failed_servers = list(
            dict.fromkeys(failed_servers)
        )

        # -------------------------------------------------
        # Validate failed servers
        # -------------------------------------------------

        for server in failed_servers:

            if server < 0 or server >= SERVER_COUNT:

                return jsonify({
                    "error": "Invalid server number"
                }), 400

        # -------------------------------------------------
        # Check active servers
        # -------------------------------------------------

        active_servers = (
            SERVER_COUNT -
            len(failed_servers)
        )

        if active_servers == 0:

            return jsonify({
                "error": "At least one server must be active"
            }), 400

        # =================================================
        # RUN ALGORITHM
        # =================================================

        if algorithm == "Round Robin":

            result = round_robin(
                requests_count,
                capacity,
                failed_servers
            )

        elif algorithm == "Least Connections":

            result = least_connections(
                requests_count,
                capacity,
                failed_servers
            )

        else:

            return jsonify({
                "error": "Unsupported algorithm"
            }), 400

        # =================================================
        # CALCULATE METRICS
        # =================================================

        accepted = result["accepted"]

        rejected = result["rejected"]

        rerouted = result["rerouted"]

        # -------------------------------------------------
        # Success rate
        # -------------------------------------------------

        success_rate = (
            (accepted / requests_count) * 100
            if requests_count > 0
            else 0
        )

        # -------------------------------------------------
        # Average load
        # -------------------------------------------------

        average_load = (
            (
                accepted /
                (active_servers * capacity)
            ) * 100
            if active_servers > 0
            else 0
        )

        average_load = min(
            round(average_load),
            100
        )

        # -------------------------------------------------
        # Estimated response time
        # -------------------------------------------------

        response_time = (
            100 +
            rerouted * 10
        )

        # =================================================
        # CONVERT FAILED SERVER INDEX
        # =================================================
        #
        # React / Python:
        # 0 = Server 1
        # 1 = Server 2
        # 2 = Server 3
        #
        # MySQL:
        # "1" = Server 1
        # "2" = Server 2
        # "3" = Server 3
        #
        # =================================================

        failed_servers_text = ",".join(
            str(server + 1)
            for server in failed_servers
        )

        # =================================================
        # SAVE RESULT TO MYSQL
        # =================================================

        try:

            save_simulation_result(
                algorithm,
                requests_count,
                accepted,
                rejected,
                rerouted,
                average_load,
                round(success_rate, 1),
                response_time,
                capacity,
                failed_servers_text
            )

        except Exception as e:

            print(
                "MySQL save error:",
                e
            )

        # =================================================
        # FINAL RESPONSE
        # =================================================

        result["totalRequests"] = requests_count

        result["capacity"] = capacity

        result["failedServers"] = failed_servers

        result["successRate"] = round(
            success_rate,
            1
        )

        result["averageLoad"] = average_load

        result["responseTime"] = response_time

        return jsonify(result)

    except Exception as e:

        print(
            "Simulation error:",
            e
        )

        return jsonify({
            "error": str(e)
        }), 500


# =====================================================
# GET SIMULATION HISTORY
# =====================================================

@app.route("/api/simulation-history", methods=["GET"])
def simulation_history():

    try:

        conn = get_db_connection()

        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                algorithm,
                total_requests,
                accepted_requests,
                rejected_requests,
                rerouted_requests,
                average_load,
                success_rate,
                response_time,
                capacity,
                failed_servers,
                created_at
            FROM simulation_history
            ORDER BY id DESC
        """)

        history = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(history)

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =====================================================
# HEALTH CHECK
# =====================================================

@app.route("/api/health", methods=["GET"])
def health():

    return jsonify({
        "status": "success",
        "message": "Cloud Load Balancing Backend is running"
    })
# =====================================================
# START SERVER
# =====================================================
init_database()
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=False
    )