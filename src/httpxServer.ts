import { Http2Server, ServerHttp2Stream, constants } from 'http2'
import { RoutersValueType, StreamSourceProps, processRoutes } from './helpers'

export interface CompleteProps {
    message?: string
    stream: ServerHttp2Stream
}

export interface ErrorProps<TError extends Error> {
    error: TError
    stream: ServerHttp2Stream
}

export interface OnPreServeProps {
    error: <TError extends Error>(props: TError) => void
    next: VoidFunction
    source: StreamSourceProps
}

export interface HttpxServerProps {
    server: Http2Server
    onComplete?: ({ message, stream }: CompleteProps) => void
    onError?: <TError extends Error>({
        error,
        stream,
    }: ErrorProps<TError>) => void
    onPreServe?: ({ error, next, source }: OnPreServeProps) => void
    port?: number
    hostname?: string
}

interface StartServeProps {
    source: StreamSourceProps
}

class HttpxServer {
    private server: Http2Server
    private routers: Map<[string, string?], RoutersValueType[]>

    complete: ({ message, stream }: CompleteProps) => void
    error: <TError extends Error>({ error, stream }: ErrorProps<TError>) => void
    onPreServe?: ({ error, next, source }: OnPreServeProps) => void
    port: number
    hostname: string

    constructor({
        server,
        onComplete = ({ stream, message }) => {
            stream.end(message)
        },
        onError = ({ error, stream }) => {
            stream.end((error as Error).message)
        },
        onPreServe,
        port = 8080,
        hostname = 'localhost',
    }: HttpxServerProps) {
        this.server = server
        this.routers = new Map<[string], RoutersValueType[]>()
        this.complete = onComplete
        this.error = onError
        this.onPreServe = onPreServe
        this.port = port
        this.hostname = hostname
    }

    serve = () => {
        this.server.on('stream', (stream, headers, flags) => {
            const source = { stream, headers, flags }
            if (!this.onPreServe) {
                this.startServe({ source })
                return
            }

            this.onPreServe({
                error: (err) => this.error({ error: err, stream }),
                next: () => this.startServe({ source }),
                source,
            })
        })

        this.server.listen(this.port, this.hostname, () => {
            console.info(`Server running on ${this.hostname}:${this.port}`)
        })
    }

    startServe = ({ source }: StartServeProps) => {
        const headerPath = source.headers[constants.HTTP2_HEADER_PATH] as
            | string
            | undefined
        if (!headerPath) {
            this.error({
                error: new Error(':path missing'),
                stream: source.stream,
            })

            return
        }
        processRoutes({
            currentPath: headerPath,
            onComplete: this.complete,
            onError: this.error,
            routers: this.routers,
            source,
        })
    }

    router = (path: string, ...callbacks: RoutersValueType[]) => {
        this.routers.set([path], callbacks)
    }
}

export default HttpxServer
