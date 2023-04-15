import http2, { constants } from 'http2'
import { routerError } from '../src/constants'
import HttpxServer, { CompleteProps, ErrorProps } from '../src/httpxServer'
import { auth } from './middlewares/auth'
import companiesRouter from './routers/CompanyRouter'
import usersRouter from './routers/UserRouter'

const handleComplete = ({ stream, message }: CompleteProps) => {
    console.log(`Complete: ${message}`)
    stream.end(message)
}

const handleError = ({ error, stream }: ErrorProps<Error>) => {
    if (error instanceof Error) {
        if (error.name === routerError.NOT_FOUND) {
            stream.respond({
                [constants.HTTP2_HEADER_CONTENT_TYPE]:
                    'text/html; charset=utf-8',
                [constants.HTTP2_HEADER_STATUS]:
                    constants.HTTP_STATUS_NOT_FOUND,
            })
            stream.end()
            return
        }
    }
    console.log(error)
    stream.end(JSON.stringify(error))
}

const httpxServer = new HttpxServer({
    httpxServer: http2.createServer(),
    onComplete: handleComplete,
    onError: handleError,
})

httpxServer.router('/users', usersRouter)
httpxServer.router('/companies', auth, companiesRouter)

httpxServer.serve()
