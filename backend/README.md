
Docker Commands
```bash
# Everyday start (images already built)
docker compose up

# Background
docker compose up -d
```

Build resets for server related
```bash
# rebuild everything that needs it, restart
docker compose up -d --build
# only the Go API
docker compose up -d --build api
# only the Python grader
docker compose up -d --build grader
```

Databases
```bash
# start / ensure it’s up
docker compose up -d postgres

# check it’s ready
docker compose exec postgres pg_isready -U voicely -d voicely
```