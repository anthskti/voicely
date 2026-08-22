# Build
FROM golang:1.26-alpine AS builder
WORKDIR /src

RUN apk add --no-cache ca-certificates git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/api

# Run
FROM alpine:latest
WORKDIR /app

RUN apk add --no-cache ca-certificates ffmpeg
COPY --from=builder /server /app/server

ENV PORT=8080
EXPOSE 8080

CMD ["/app/server"]
