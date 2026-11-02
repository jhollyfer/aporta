# MinIO for local test and CI; never production, which uses S3 or R2
# (`_standards/tooling.md` §8.4). The `minio/minio` image left Docker Hub and the
# community repository only distributes source code: `minio` and `mc` are
# built from a pinned release.
FROM golang:1.24-alpine AS build
ARG MINIO_RELEASE=RELEASE.2025-10-15T17-29-55Z
ARG MC_RELEASE=RELEASE.2025-08-13T08-35-41Z
RUN apk add --no-cache git
ENV CGO_ENABLED=0
RUN git clone --depth 1 --branch "$MINIO_RELEASE" https://github.com/minio/minio /src/minio \
 && cd /src/minio && go build -trimpath -o /out/minio .
RUN git clone --depth 1 --branch "$MC_RELEASE" https://github.com/minio/mc /src/mc \
 && cd /src/mc && go build -trimpath -o /out/mc .

FROM alpine:3.24
COPY --from=build /out/minio /out/mc /usr/local/bin/
ENTRYPOINT ["minio"]
