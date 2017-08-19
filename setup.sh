#!/bin/sh
ISERROR=0

export PATH="$PATH:$(pwd)/node_modules/.bin/"

which npm > /dev/null 2>&1
if [ $? -ne 0 ] ; then
  echo "command not found: npm"
  echo "please install npm. e.g. sudo port install npm"
  ISERROR=1
fi

if [ $ISERROR == 1 ] ; then
  exit
fi

npm install && npm install --only=dev && tsc && npm run gen
tsc --noImplicitAny --module commonjs atom.d.ts
