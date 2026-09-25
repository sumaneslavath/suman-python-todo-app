# suman-python-todo-app

Beginner-friendly Python Flask Todo application using JSON file storage.

## Features
- Create, edit and delete tasks
- Title, optional description, due date and status
- New tasks automatically start as `pending`
- Checkbox toggles pending/completed
- Completed tasks are visually different
- Completed tasks can be returned to pending
- All/Pending/Completed filters
- Past-due pending tasks are marked OVERDUE
- Pending tasks due today through the next 3 days are highlighted
- No database; persistent `data/task.json`
- Uploaded Suman logo at top-left
- Uploaded profile image at top-right
- Responsive UI and hover effects

## Structure
```text
suman-python-todo-app/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── requirements.txt
├── README.md
├── app.py
├── data/task.json
├── templates/index.html
└── static/
    ├── app.js
    ├── style.css
    └── images/
        ├── suman-logo.png
        └── suman-profile.png
```

## Local run
```bash
python -m venv venv
```

Windows:
```cmd
venv\Scripts\activate
```

Linux/macOS:
```bash
source venv/bin/activate
```

Install:
```bash
pip install -r requirements.txt
```

Run:
```bash
python app.py
```

Open:
```text
http://localhost:8080
```

## Docker
Build:
```bash
docker build -t suman-python-todo-app:latest .
```

Run:
```bash
docker run -d --name suman-python-todo-app -p 8080:8080 -v todo-data:/app/data suman-python-todo-app:latest
```

Open:
```text
http://localhost:8080
```

## Docker Hub example
```bash
docker login
docker tag suman-python-todo-app:latest YOUR_DOCKERHUB_USERNAME/suman-python-todo-app:latest
docker push YOUR_DOCKERHUB_USERNAME/suman-python-todo-app:latest
```

## API
GET `/api/tasks?filter=all`
GET `/api/tasks?filter=pending`
GET `/api/tasks?filter=completed`

POST `/api/tasks`
```json
{
  "title": "Learn Docker",
  "description": "Practice Docker",
  "dueDate": "2026-09-28"
}
```

PUT `/api/tasks/1`

PATCH `/api/tasks/1/complete`

DELETE `/api/tasks/1`

The create API automatically sets status to `pending`. The complete endpoint toggles `pending` and `completed`.
# suman-python-todo-app
