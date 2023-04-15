import { Http2Server, ServerHttp2Stream, constants } from 'http2'
import {
    RoutersValueType,
    StreamRouterCallbackType,
    processRoutes,
} from './helpers'
import StreamRouter from './streamRouter'

export interface CompleteProps {
    message?: string
    stream: ServerHttp2Stream
}

export interface ErrorProps<TError = Error> {
    error: TError
    stream: ServerHttp2Stream
}

export interface HttpxServerProps {
    httpxServer: Http2Server
    onComplete?: ({ message, stream }: CompleteProps) => void
    onError?: <TError = Error>({ error, stream }: ErrorProps<TError>) => void
    port?: number
    hostname?: string
}

class HttpxServer {
    private httpxServer: Http2Server
    private routers: Map<[string, string?], RoutersValueType[]>
    complete: ({ message, stream }: CompleteProps) => void
    error: <TError = Error>({ error, stream }: ErrorProps<TError>) => void
    port: number
    hostname: string

    constructor({
        httpxServer,
        onComplete = ({ stream, message }) => {
            stream.end(message)
        },
        onError = ({ error, stream }) => {
            stream.end((error as Error).message)
        },
        port = 8080,
        hostname = 'localhost',
    }: HttpxServerProps) {
        this.httpxServer = httpxServer
        this.routers = new Map<[string], RoutersValueType[]>()
        this.complete = onComplete
        this.error = onError
        this.port = port
        this.hostname = hostname
    }

    serve = () => {
        this.httpxServer.on('stream', (stream, headers, flags) => {
            const headerPath = headers[constants.HTTP2_HEADER_PATH] as
                | string
                | undefined
            if (!headerPath) {
                this.error({
                    error: new Error(':path missing'),
                    stream,
                })

                return
            }
            processRoutes({
                currentPath: headerPath,
                onComplete: this.complete,
                onError: this.error,
                routers: this.routers,
                source: { flags, headers, stream },
            })
        })

        this.httpxServer.listen(this.port, this.hostname, () => {
            console.info(`Server running on ${this.hostname}:${this.port}`)
        })
    }

    router = (
        path: string,
        ...callbacks: (StreamRouter | StreamRouterCallbackType)[]
    ) => {
        this.routers.set([path], callbacks)
    }
}

export default HttpxServer
