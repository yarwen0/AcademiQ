FROM golang:1.23 AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/academiq-api ./cmd/api

FROM debian:bookworm-slim

WORKDIR /app

COPY --from=build /out/academiq-api /usr/local/bin/academiq-api

EXPOSE 8080

CMD ["academiq-api"]
