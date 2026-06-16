#!/bin/sh
set -e

yarn prisma:deploy

exec "$@"