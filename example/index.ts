import http2, { constants } from 'http2'
import { routerError } from '../src/constants'
import HttpxServer, { CompleteProps, ErrorProps } from '../src/httpxServer'
import { auth } from './middlewares/auth'
import companiesRouter from './routers/CompanyRouter'
import usersRouter from './routers/UserRouter'

const handleComplete = ({ stream, message }: CompleteProps) => {
    console.log(`Complete: ${message ?? 'no message'}`)
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

// // If you want to handle something prior to the stream getting served

// const handlePreServe = ({ error, next, source }: OnPreServeProps) => {
//     console.log(`HandlePreServe headers: ${JSON.stringify(source.headers)}`)
//     source.stream.respond({
//         [constants.HTTP2_HEADER_STATUS]:
//             constants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
//     })
//     error(new Error('I want to stop'))
// }

const httpxServer = new HttpxServer({
    httpxServer: http2.createServer(),
    onComplete: handleComplete,
    onError: handleError,
    // onPreServe: handlePreServe,
})

httpxServer.router('/users/{userId}', usersRouter)
httpxServer.router('/companies', auth, companiesRouter)

httpxServer.serve()
