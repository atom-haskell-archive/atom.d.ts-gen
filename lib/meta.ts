import fs = require('fs')
import path = require('path')

const content = fs.readFileSync(path.resolve(__dirname, '../fixture/api.json'), 'utf8')
// tslint:disable-next-line:no-unsafe-any
const meta: AtomDocTypes.Metadata = JSON.parse(content)
export = meta
