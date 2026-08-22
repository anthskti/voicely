import os

from dotenv import load_dotenv
from fastapi import FastAPI

from api.routes import router

load_dotenv()

app = FastAPI(title="Voicely Grader", version="0.1.0")
app.include_router(router)


def main() -> None:
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
