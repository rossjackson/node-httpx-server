import http2 from 'http2'
import HttpxServer from '../src/httpxServer'
import { auth } from './middlewares/auth'
import companiesRouter from './routers/CompanyRouter'
import usersRouter from './routers/UserRouter'

const httpxServer = new HttpxServer({
    httpxServer: http2.createServer(),
})

httpxServer.router('/users', usersRouter)
httpxServer.router('/companies', auth, companiesRouter)

httpxServer.load()
