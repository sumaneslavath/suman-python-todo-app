from datetime import datetime
import json
import os
import threading
from pathlib import Path

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import BadRequest

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "task.json"

app = Flask(__name__)
file_lock = threading.Lock()


def ensure_data_file():
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text("[]", encoding="utf-8")


def read_tasks():
    ensure_data_file()
    try:
        raw = DATA_FILE.read_text(encoding="utf-8").strip()
        return json.loads(raw or "[]")
    except (json.JSONDecodeError, OSError) as exc:
        raise RuntimeError(f"Unable to read task.json: {exc}") from exc


def write_tasks(tasks):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp_file = DATA_FILE.with_suffix(".tmp")
    temp_file.write_text(
        json.dumps(tasks, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    os.replace(temp_file, DATA_FILE)


def next_id(tasks):
    return max((int(t.get("id", 0)) for t in tasks), default=0) + 1


def validate_payload(payload):
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")

    title = str(payload.get("title", "")).strip()
    description = str(payload.get("description", "")).strip()
    due_date = str(payload.get("dueDate", "")).strip()

    if not title:
        raise ValueError("Task title is required.")
    if not due_date:
        raise ValueError("Due date is required.")

    try:
        datetime.strptime(due_date, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError("Due date must use YYYY-MM-DD format.") from exc

    return title, description, due_date


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/api/tasks")
def get_tasks():
    filter_name = request.args.get("filter", "all").lower()
    if filter_name not in {"all", "pending", "completed"}:
        return jsonify({"error": "filter must be all, pending, or completed"}), 400

    with file_lock:
        tasks = read_tasks()

    if filter_name != "all":
        tasks = [t for t in tasks if t.get("status") == filter_name]

    tasks.sort(key=lambda t: t.get("dueDate", ""))
    return jsonify(tasks)


@app.post("/api/tasks")
def create_task():
    try:
        payload = request.get_json(force=True)
        title, description, due_date = validate_payload(payload)
    except (BadRequest, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400

    with file_lock:
        tasks = read_tasks()
        task = {
            "id": next_id(tasks),
            "title": title,
            "description": description,
            "dueDate": due_date,
            "status": "pending",
        }
        tasks.append(task)
        write_tasks(tasks)

    return jsonify(task), 201


@app.put("/api/tasks/<int:task_id>")
def update_task(task_id):
    try:
        payload = request.get_json(force=True)
        title, description, due_date = validate_payload(payload)
    except (BadRequest, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400

    with file_lock:
        tasks = read_tasks()
        task = next((t for t in tasks if t.get("id") == task_id), None)
        if task is None:
            return jsonify({"error": "Task not found"}), 404

        task.update({
            "title": title,
            "description": description,
            "dueDate": due_date,
        })
        write_tasks(tasks)

    return jsonify(task)


@app.patch("/api/tasks/<int:task_id>/complete")
def toggle_complete(task_id):
    with file_lock:
        tasks = read_tasks()
        task = next((t for t in tasks if t.get("id") == task_id), None)
        if task is None:
            return jsonify({"error": "Task not found"}), 404

        task["status"] = "completed" if task.get("status") == "pending" else "pending"
        write_tasks(tasks)

    return jsonify(task)


@app.delete("/api/tasks/<int:task_id>")
def delete_task(task_id):
    with file_lock:
        tasks = read_tasks()
        updated = [t for t in tasks if t.get("id") != task_id]

        if len(updated) == len(tasks):
            return jsonify({"error": "Task not found"}), 404

        write_tasks(updated)

    return "", 204


if __name__ == "__main__":
    ensure_data_file()
    app.run(host="0.0.0.0", port=8080)
