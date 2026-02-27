// scratch.js
import {DirectoryObject, Cache} from '@gesslar/toolkit'
import ResolveCommand from '../src/ResolveCommand.js'
import Theme from '../src/Theme.js'

const cwd = DirectoryObject.fromCwd()
const command = new ResolveCommand({cwd, packageJson: {}})
command.setCache(new Cache())
const theme = new Theme(cwd.getFile('advanced/blackboard-hushed.yaml'), cwd, {outputDir: '.'})
theme.setCache(command.getCache())
await theme.load()
await theme.build()
console.log(JSON.stringify(await command.resolve(theme, {color: 'gitDecoration.modifiedResourceForeground'}), null, 2))
